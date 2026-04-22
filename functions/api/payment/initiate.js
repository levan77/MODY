import { encryptPayload } from '../../utils/keepzCrypto.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/payment/initiate
 *
 * Body: { bookingId: string (UUID), amount: number, currency: string }
 * Returns: { paymentUrl: string }
 */
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { bookingId, amount, currency = 'GEL' } = body;

  if (!bookingId || !UUID_RE.test(bookingId)) {
    return json({ error: 'bookingId must be a valid UUID' }, 400);
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return json({ error: 'amount must be a positive number' }, 400);
  }

  const orderPayload = {
    integratorOrderId: bookingId,
    amount,
    currency,
    successRedirectUrl: `${env.APP_URL}/payment-success`,
    failRedirectUrl: `${env.APP_URL}/payment-fail`,
    callbackUrl: `${env.APP_URL}/api/payment/webhook`,
  };

  let encryptedData, encryptedKeys;
  try {
    ({ encryptedData, encryptedKeys } = await encryptPayload(
      orderPayload,
      env.KEEPZ_RSA_PUBLIC_KEY,
    ));
  } catch (err) {
    console.error('Keepz encryption error:', err);
    return json({ error: 'Encryption failed' }, 500);
  }

  let keepzRes;
  try {
    keepzRes = await fetch(env.KEEPZ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: env.KEEPZ_IDENTIFIER,
        encryptedData,
        encryptedKeys,
      }),
    });
  } catch (err) {
    console.error('Keepz API request error:', err);
    return json({ error: 'Failed to reach Keepz API' }, 502);
  }

  if (!keepzRes.ok) {
    const errText = await keepzRes.text().catch(() => '');
    console.error(`Keepz API error ${keepzRes.status}:`, errText);
    return json({ error: 'Keepz order creation failed' }, 502);
  }

  let keepzBody;
  try {
    keepzBody = await keepzRes.json();
  } catch {
    return json({ error: 'Invalid response from Keepz' }, 502);
  }

  const paymentUrl = keepzBody.paymentUrl ?? keepzBody.redirectUrl ?? keepzBody.url;
  if (!paymentUrl) {
    console.error('Keepz response missing payment URL:', JSON.stringify(keepzBody));
    return json({ error: 'No payment URL in Keepz response' }, 502);
  }

  return json({ paymentUrl });
}
