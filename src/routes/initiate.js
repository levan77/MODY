import { encryptPayload, decryptPayload } from '../utils/keepzCrypto.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUIRED_ENV = [
  'KEEPZ_RSA_PUBLIC_KEY',
  'KEEPZ_IDENTIFIER',
  'KEEPZ_API_URL',
  'APP_URL',
  'AMODY_RSA_PRIVATE_KEY',
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
    receiverId: 'ee35dec5-19d2-453e-8793-36ad6f510da8',
    successRedirectUri: `${env.APP_URL}/payment-success`,
    failRedirectUri: `${env.APP_URL}/payment-fail`,
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
        aes: true,
      }),
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
      identifierUsed: env.KEEPZ_IDENTIFIER
        ? `${env.KEEPZ_IDENTIFIER.slice(0, 4)}…(${env.KEEPZ_IDENTIFIER.length} chars)`
        : 'MISSING',
    }, 502);
  }

  // Keepz response is also encrypted — decrypt with AMODY's RSA private key
  let keepzRawBody;
  try {
    keepzRawBody = await keepzRes.json();
  } catch {
    return json({ error: 'Invalid (non-JSON) response from Keepz' }, 502);
  }

  let keepzDecrypted;
  try {
    keepzDecrypted = await decryptPayload(
      keepzRawBody.encryptedKeys,
      keepzRawBody.encryptedData,
      env.AMODY_RSA_PRIVATE_KEY,
    );
  } catch (err) {
    // Response may not be encrypted on all Keepz environments — fall back to raw
    console.warn('Keepz response decryption failed, trying raw:', err.message);
    keepzDecrypted = keepzRawBody;
  }

  const paymentUrl =
    keepzDecrypted.paymentUrl ??
    keepzDecrypted.redirectUrl ??
    keepzDecrypted.link ??
    keepzDecrypted.url;

  if (!paymentUrl) {
    console.error('Keepz decrypted response missing payment URL:', JSON.stringify(keepzDecrypted));
    return json({
      error: 'No payment URL in Keepz response',
      keepzDecrypted: JSON.stringify(keepzDecrypted),
    }, 502);
  }

  return json({ paymentUrl });
}
