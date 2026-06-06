// Flitt PRE-AUTHORIZATION (funds HELD, not captured). Self-contained (no imports).
// Amount is read SERVER-SIDE from the booking — never trusted from the client.

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
    insert: async (t, row) => { const r = await fetch(base + '/' + t, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(row) }); if (!r.ok) throw new Error('INSERT ' + r.status + ' ' + (await r.text())); return r.json(); },
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
    const rows = await sb.get(`/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,total,service_price,discount_amount,client_id,client_name,pro_id,pro_name,status,payment_status`);
    const bk = rows[0];
    if (!bk) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (!(bk.total > 0)) return Response.json({ error: 'Invalid booking amount' }, { status: 400 });
    if (bk.payment_status === 'authorized' || bk.payment_status === 'paid')
      return Response.json({ error: 'This booking is already paid or held' }, { status: 409 });

    let commissionRate = 5;
    try {
      const pr = await sb.get(`/professionals?id=eq.${encodeURIComponent(bk.pro_id)}&select=commission_rate`);
      if (pr[0] && pr[0].commission_rate != null) commissionRate = Number(pr[0].commission_rate);
    } catch { /* default */ }
    const proEarnings = Math.round((bk.service_price || 0) * (1 - commissionRate / 100));
    const platformRevenue = bk.total - proEarnings;

    let payment;
    const existing = await sb.get(`/payments?booking_id=eq.${encodeURIComponent(bookingId)}&status=in.(pending,authorized)&select=*&order=created_at.desc&limit=1`);
    if (existing[0]) {
      payment = existing[0];
    } else {
      const ins = await sb.insert('payments', {
        booking_id: bk.id, client_id: bk.client_id, client_name: bk.client_name,
        pro_id: bk.pro_id, pro_name: bk.pro_name, amount: bk.total, currency: 'GEL',
        service_price: bk.service_price, discount_amount: bk.discount_amount,
        commission_rate: commissionRate, pro_earnings: proEarnings, platform_revenue: platformRevenue,
        provider: 'flitt', provider_order_id: String(bk.id), status: 'pending',
      });
      payment = ins[0];
    }

    const orderParams = {
      merchant_id: Number(env.FLITT_MERCHANT_ID),
      order_id: String(bk.id),
      order_desc: 'AMODY booking ' + String(bk.id).slice(0, 8),
      amount: Math.round(bk.total * 100),
      currency: 'GEL',
      preauth: 'Y',
      response_url: env.APP_URL + '/?pay=return&booking=' + encodeURIComponent(bk.id),
      server_callback_url: env.APP_URL + '/api/payment/webhook',
    };
    const signature = await flittSig(env.FLITT_SECRET_KEY, orderParams);
    const res = await fetch('https://pay.flitt.com/api/checkout/url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { ...orderParams, signature } }),
    });
    const json = await res.json();
    if (json.response?.response_status !== 'success')
      return Response.json({ error: 'Flitt error', detail: json }, { status: 502 });

    return Response.json({ checkoutUrl: json.response.checkout_url, paymentId: payment.id });
  } catch (e) {
    return Response.json({ error: 'Server error', detail: String(e && e.message || e) }, { status: 500 });
  }
}
