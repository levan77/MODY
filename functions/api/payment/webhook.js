import { createClient } from '@supabase/supabase-js';
import { decryptPayload } from '../../utils/keepzCrypto.js';

// Map Keepz terminal statuses to our payment_status column values
const STATUS_MAP = {
  SUCCESS: 'paid',
  FAILED: 'failed',
  CANCELLED: 'failed',
  DECLINED: 'failed',
  EXPIRED: 'failed',
};

/**
 * POST /api/payment/webhook
 *
 * Called by Keepz after a transaction completes.
 * Must return HTTP 200 quickly; DB update runs via waitUntil.
 */
export async function onRequestPost({ request, env, ctx }) {
  let body;
  try {
    body = await request.json();
  } catch {
    // Return 200 even on bad input so Keepz doesn't retry indefinitely
    return new Response(null, { status: 200 });
  }

  const { encryptedKeys, encryptedData } = body;

  if (!encryptedKeys || !encryptedData) {
    return new Response(null, { status: 200 });
  }

  // Decrypt and update DB asynchronously — Keepz only needs the 200 ack
  ctx.waitUntil(processWebhook(encryptedKeys, encryptedData, env));

  return new Response(null, { status: 200 });
}

async function processWebhook(encryptedKeys, encryptedData, env) {
  let data;
  try {
    data = await decryptPayload(encryptedKeys, encryptedData, env.AMODY_RSA_PRIVATE_KEY);
  } catch (err) {
    console.error('Keepz webhook decryption error:', err);
    return;
  }

  const bookingId = data.integratorOrderId;
  const keepzStatus = (data.status ?? '').toUpperCase();
  const paymentStatus = STATUS_MAP[keepzStatus];

  if (!bookingId || !paymentStatus) {
    console.error('Keepz webhook: unrecognised payload', JSON.stringify(data));
    return;
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from('bookings')
    .update({
      payment_status: paymentStatus,
      keepz_order_id: data.orderId ?? data.transactionId ?? null,
    })
    .eq('id', bookingId);

  if (error) {
    console.error(`Keepz webhook: Supabase update failed for booking ${bookingId}:`, error.message);
  }
}
