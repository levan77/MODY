import { buildSignature } from '../../utils/flittSignature.js';
import { sb } from '../../utils/supabase.js';

// Flitt server-to-server callback. Fires when the authorization (hold) result
// is known. Verifies signature + amount, then records the result in the
// payments ledger and on the booking. Idempotent.
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return new Response('Bad request', { status: 400 }); }

  // Verify Flitt signature (sign all params except the signature fields).
  const { signature: received, response_signature_string, ...params } = body;
  const expected = await buildSignature(env.FLITT_SECRET_KEY, params);
  if (expected !== received) return new Response('Bad signature', { status: 400 });

  const db = sb(env);
  const bookingId = body.order_id;
  if (!bookingId) return new Response('Missing order_id', { status: 400 });

  const approved = body.order_status === 'approved';
  const nowIso = new Date().toISOString();

  // Find the matching ledger row.
  let pay = null;
  try {
    const pays = await db.get(
      `/payments?booking_id=eq.${encodeURIComponent(bookingId)}&select=*&order=created_at.desc&limit=1`
    );
    pay = pays[0] || null;
  } catch (e) {
    return new Response('Ledger lookup failed', { status: 500 });
  }

  // Already captured/voided → final state, ignore further auth callbacks (idempotency).
  if (pay && (pay.status === 'captured' || pay.status === 'voided')) {
    return new Response('OK', { status: 200 });
  }

  // Amount tamper check.
  if (pay && approved) {
    const expectedMinor = Math.round(pay.amount * 100);
    if (Number(body.amount) !== expectedMinor) {
      await db.patch('payments', `id=eq.${pay.id}`, {
        status: 'failed', raw: body, updated_at: nowIso,
      });
      await db.patch('bookings', `id=eq.${encodeURIComponent(bookingId)}`, { payment_status: 'failed' });
      return new Response('Amount mismatch', { status: 400 });
    }
  }

  const payStatus = approved ? 'authorized' : 'failed';
  if (pay) {
    await db.patch('payments', `id=eq.${pay.id}`, {
      status: payStatus,
      provider_payment_id: String(body.payment_id || ''),
      authorized_at: approved ? nowIso : null,
      raw: body,
      updated_at: nowIso,
    });
  }
  await db.patch('bookings', `id=eq.${encodeURIComponent(bookingId)}`, {
    payment_status: approved ? 'authorized' : 'failed',
    flitt_order_id: String(body.payment_id || ''),
  });

  return new Response('OK', { status: 200 });
}
