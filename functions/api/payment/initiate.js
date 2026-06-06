import { buildSignature } from '../../utils/flittSignature.js';
import { sb } from '../../utils/supabase.js';

// Starts a Flitt PRE-AUTHORIZATION (funds are HELD on the card, not captured).
// The amount is read SERVER-SIDE from the booking — never trusted from the client.
export async function onRequestPost({ request, env }) {
  let bookingId;
  try { ({ bookingId } = await request.json()); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }
  if (!bookingId) return Response.json({ error: 'Missing bookingId' }, { status: 400 });

  const db = sb(env);

  // Source of truth for the amount: the booking row.
  let bk;
  try {
    const rows = await db.get(
      `/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,total,service_price,discount_amount,client_id,client_name,pro_id,pro_name,status,payment_status`
    );
    bk = rows[0];
  } catch (e) {
    return Response.json({ error: 'Lookup failed', detail: String(e) }, { status: 500 });
  }
  if (!bk) return Response.json({ error: 'Booking not found' }, { status: 404 });
  if (!(bk.total > 0)) return Response.json({ error: 'Invalid booking amount' }, { status: 400 });
  if (bk.payment_status === 'authorized' || bk.payment_status === 'paid') {
    return Response.json({ error: 'This booking is already paid or held' }, { status: 409 });
  }

  // Commission → pro earnings split (for the ledger).
  let commissionRate = 5;
  try {
    const pr = await db.get(`/professionals?id=eq.${encodeURIComponent(bk.pro_id)}&select=commission_rate`);
    if (pr[0] && pr[0].commission_rate != null) commissionRate = Number(pr[0].commission_rate);
  } catch { /* default 5% */ }
  const proEarnings = Math.round((bk.service_price || 0) * (1 - commissionRate / 100));
  const platformRevenue = bk.total - proEarnings;

  // Reuse an existing pending/authorized payment, else create a pending ledger row.
  let payment;
  try {
    const existing = await db.get(
      `/payments?booking_id=eq.${encodeURIComponent(bookingId)}&status=in.(pending,authorized)&select=*&order=created_at.desc&limit=1`
    );
    if (existing[0]) {
      payment = existing[0];
    } else {
      const ins = await db.insert('payments', {
        booking_id: bk.id,
        client_id: bk.client_id, client_name: bk.client_name,
        pro_id: bk.pro_id, pro_name: bk.pro_name,
        amount: bk.total, currency: 'GEL',
        service_price: bk.service_price, discount_amount: bk.discount_amount,
        commission_rate: commissionRate, pro_earnings: proEarnings, platform_revenue: platformRevenue,
        provider: 'flitt', provider_order_id: String(bk.id), status: 'pending',
      });
      payment = ins[0];
    }
  } catch (e) {
    return Response.json({ error: 'Ledger write failed', detail: String(e) }, { status: 500 });
  }

  const orderParams = {
    merchant_id: Number(env.FLITT_MERCHANT_ID),
    order_id: String(bk.id),
    order_desc: 'AMODY booking ' + String(bk.id).slice(0, 8),
    amount: Math.round(bk.total * 100), // minor units (tetri)
    currency: 'GEL',
    preauth: 'Y',                       // hold funds now, capture after the service
    response_url: env.APP_URL + '/?pay=return&booking=' + encodeURIComponent(bk.id),
    server_callback_url: env.APP_URL + '/api/payment/webhook',
  };
  const signature = await buildSignature(env.FLITT_SECRET_KEY, orderParams);

  let json;
  try {
    const res = await fetch('https://pay.flitt.com/api/checkout/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { ...orderParams, signature } }),
    });
    json = await res.json();
  } catch (e) {
    return Response.json({ error: 'Flitt unreachable', detail: String(e) }, { status: 502 });
  }
  if (json.response?.response_status !== 'success') {
    return Response.json({ error: 'Flitt error', detail: json }, { status: 502 });
  }

  return Response.json({ checkoutUrl: json.response.checkout_url, paymentId: payment.id });
}
