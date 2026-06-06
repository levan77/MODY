// Flitt server callback. Self-contained (no imports). Verifies signature +
// amount, records the result in the payments ledger and on the booking. Idempotent.

async function flittSig(secretKey, params) {
  const sorted = Object.keys(params).sort()
    .filter(k => params[k] !== '' && params[k] != null).map(k => String(params[k]));
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode([secretKey, ...sorted].join('|')));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function db(env) {
  const base = env.SUPABASE_URL + '/rest/v1';
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };
  return {
    get: async (p) => { const r = await fetch(base + p, { headers: h }); if (!r.ok) throw new Error('GET ' + r.status + ' ' + (await r.text())); return r.json(); },
    patch: async (t, q, p) => { const r = await fetch(base + '/' + t + '?' + q, { method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(p) }); if (!r.ok) throw new Error('PATCH ' + r.status + ' ' + (await r.text())); return r.json(); },
  };
}

export async function onRequestPost({ request, env }) {
  try {
    let body;
    try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

    const { signature: received, response_signature_string, ...params } = body;
    const expected = await flittSig(env.FLITT_SECRET_KEY, params);
    if (expected !== received) return new Response('Bad signature', { status: 400 });

    const sb = db(env);
    const bookingId = body.order_id;
    if (!bookingId) return new Response('Missing order_id', { status: 400 });

    const approved = body.order_status === 'approved';
    const nowIso = new Date().toISOString();

    const pays = await sb.get(`/payments?booking_id=eq.${encodeURIComponent(bookingId)}&select=*&order=created_at.desc&limit=1`);
    const pay = pays[0] || null;

    // Final states are immutable — ignore further auth callbacks (idempotency).
    if (pay && (pay.status === 'captured' || pay.status === 'voided')) {
      return new Response('OK', { status: 200 });
    }

    if (pay && approved) {
      const expectedMinor = Math.round(pay.amount * 100);
      if (Number(body.amount) !== expectedMinor) {
        await sb.patch('payments', `id=eq.${pay.id}`, { status: 'failed', raw: body, updated_at: nowIso });
        await sb.patch('bookings', `id=eq.${encodeURIComponent(bookingId)}`, { payment_status: 'failed' });
        return new Response('Amount mismatch', { status: 400 });
      }
    }

    if (pay) {
      await sb.patch('payments', `id=eq.${pay.id}`, {
        status: approved ? 'authorized' : 'failed',
        provider_payment_id: String(body.payment_id || ''),
        authorized_at: approved ? nowIso : null,
        raw: body, updated_at: nowIso,
      });
    }
    await sb.patch('bookings', `id=eq.${encodeURIComponent(bookingId)}`, {
      payment_status: approved ? 'authorized' : 'failed',
      flitt_order_id: String(body.payment_id || ''),
    });

    return new Response('OK', { status: 200 });
  } catch (e) {
    return new Response('Server error: ' + String(e && e.message || e), { status: 500 });
  }
}
