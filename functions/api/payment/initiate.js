import { buildSignature } from '../../utils/flittSignature.js';

export async function onRequestPost({ request, env }) {
  let bookingId, amount, currency;
  try {
    ({ bookingId, amount, currency } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!bookingId || !(amount > 0)) {
    return Response.json({ error: 'Missing bookingId or amount' }, { status: 400 });
  }

  const amountMinor = Math.round(amount * 100);
  const orderParams = {
    merchant_id: Number(env.FLITT_MERCHANT_ID),
    order_id: bookingId,
    order_desc: 'AMODY Booking',
    amount: amountMinor,
    currency: currency || 'GEL',
    response_url: env.APP_URL + '/',
    server_callback_url: env.APP_URL + '/api/payment/webhook',
  };

  const signature = await buildSignature(env.FLITT_SECRET_KEY, orderParams);

  const res = await fetch('https://pay.flitt.com/api/checkout/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request: { ...orderParams, signature } }),
  });

  const json = await res.json();
  if (json.response?.response_status !== 'success') {
    return Response.json({ error: 'Flitt error', detail: json }, { status: 502 });
  }

  return Response.json({ checkoutUrl: json.response.checkout_url });
}
