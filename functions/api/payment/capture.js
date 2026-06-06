// Captures held funds AFTER the service is completed. Self-contained (no imports).
// Guarded: only when booking.status = 'completed' and an 'authorized' hold exists.

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
    let bookingId;
    try { ({ bookingId } = await request.json()); }
    catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }
    if (!bookingId) return Response.json({ error: 'Missing bookingId' }, { status: 400 });

    const sb = db(env);
    const bks = await sb.get(`/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,status,payment_status`);
    const bk = bks[0];
    if (!bk) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (bk.status !== 'completed') return Response.json({ error: 'Booking is not completed' }, { status: 409 });
    if (bk.payment_status !== 'authorized') return Response.json({ ok: true, note: 'No held funds to capture' });

    const pays = await sb.get(`/payments?booking_id=eq.${encodeURIComponent(bookingId)}&status=eq.authorized&select=*&order=created_at.desc&limit=1`);
    const pay = pays[0];
    if (!pay) return Response.json({ ok: true, note: 'No authorized payment row' });

    const params = { merchant_id: Number(env.FLITT_MERCHANT_ID), order_id: String(bookingId), amount: Math.round(pay.amount * 100), currency: 'GEL' };
    const signature = await flittSig(env.FLITT_SECRET_KEY, params);
    const res = await fetch('https://pay.flitt.com/api/capture/order_id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { ...params, signature } }),
    });
    const json = await res.json();
    const r = json.response || {};
    const ok = r.response_status === 'success' && (r.capture_status === 'captured' || r.order_status === 'approved');
    if (!ok) return Response.json({ error: 'Capture failed', detail: json }, { status: 502 });

    const nowIso = new Date().toISOString();
    await sb.patch('payments', `id=eq.${pay.id}`, { status: 'captured', captured_at: nowIso, raw: r, updated_at: nowIso });
    await sb.patch('bookings', `id=eq.${encodeURIComponent(bookingId)}`, { payment_status: 'paid' });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Server error', detail: String(e && e.message || e) }, { status: 500 });
  }
}
