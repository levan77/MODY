import { encryptPayload } from '../utils/keepzCrypto.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUIRED_ENV = [
  'KEEPZ_RSA_PUBLIC_KEY',
  'KEEPZ_IDENTIFIER',
  'KEEPZ_API_URL',
  'APP_URL',
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/payment/initiate
 *
 * Body: { bookingId: string (UUID), amount: number|string, currency: string }
 * Returns: { paymentUrl: string }
 */
export async function handleInitiate(request, env) {
  // Fast-fail if Worker is not configured — surfaces missing env vars clearly
  const missing = REQUIRED_ENV.filter((k) => !env[k]);
  if (missing.length) {
    console.error('Keepz initiate: missing env vars:', missing.join(', '));
    return json({ error: `Worker not configured: missing ${missing.join(', ')}` }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { bookingId, currency = 'GEL' } = body;
  // Accept amount as number or numeric string (Supabase NUMERIC columns return strings)
  const amount = Number(body.amount);

  if (!bookingId || !UUID_RE.test(bookingId)) {
    return json({ error: 'bookingId must be a valid UUID' }, 400);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
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

  const keepzReqBody = JSON.stringify({
    identifier: env.KEEPZ_IDENTIFIER,
    encryptedData,
    encryptedKeys,
  });

  let keepzRes;
  try {
    keepzRes = await fetch(env.KEEPZ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: keepzReqBody,
    });
  } catch (err) {
    console.error('Keepz API request error:', err);
    return json({ error: 'Failed to reach Keepz API', detail: String(err) }, 502);
  }

  if (!keepzRes.ok) {
    const errText = await keepzRes.text().catch(() => '');
    console.error(`Keepz API error ${keepzRes.status}:`, errText);
    return json({
      error: 'Keepz order creation failed',
      keepzStatus: keepzRes.status,
      keepzBody: errText,
      sentTo: env.KEEPZ_API_URL,
      identifierUsed: env.KEEPZ_IDENTIFIER ? `${env.KEEPZ_IDENTIFIER.slice(0, 4)}…(${env.KEEPZ_IDENTIFIER.length} chars)` : 'MISSING',
    }, 502);
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
