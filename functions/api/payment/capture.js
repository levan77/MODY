import { buildSignature } from '../../utils/flittSignature.js';
import { sb } from '../../utils/supabase.js';

// Captures the held funds AFTER the service is completed.
// Guarded: only captures when the booking status is 'completed' in the DB
// (booking status is itself protected by RLS), and only an 'authorized' hold.
export async function onRequestPost({ request, env }) {
  let bookingId;
  try { ({ bookingId } = await request.json()); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }
  if (!bookingId) return Response.json({ error: 'Missing bookingId' }, { status: 400 });

  const db = sb(env);

  const bks = await db.get(
    `/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,status,payment_status`
  );
  const bk = bks[0];
  if (!bk) return Response.json({ error: 'Booking not found' }, { status: 404 });
  if (bk.status !== 'completed') {
    return Response.json({ error: 'Booking is not completed' }, { status: 409 });
  }
  if (bk.payment_status !== 'authorized') {
    return Response.json({ ok: true, note: 'No held funds to capture' });
  }

  const pays = await db.get(
    `/payments?booking_id=eq.${encodeURIComponent(bookingId)}&status=eq.authorized&select=*&order=created_at.desc&limit=1`
  );
  const pay = pays[0];
  if (!pay) return Response.json({ ok: true, note: 'No authorized payment row' });

  const params = {
    merchant_id: Number(env.FLITT_MERCHANT_ID),
    order_id: String(bookingId),
    amount: Math.round(pay.amount * 100),
    currency: 'GEL',
  };
  const signature = await buildSignature(env.FLITT_SECRET_KEY, params);

  let json;
  try {
    const res = await fetch('https://pay.flitt.com/api/capture/order_id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { ...params, signature } }),
    });
    json = await res.json();
  } catch (e) {
    return Response.json({ error: 'Flitt unreachable', detail: String(e) }, { status: 502 });
  }

  const r = json.response || {};
  const ok = r.response_status === 'success' &&
    (r.capture_status === 'captured' || r.order_status === 'approved');
  if (!ok) return Response.json({ error: 'Capture failed', detail: json }, { status: 502 });

  const nowIso = new Date().toISOString();
  await db.patch('payments', `id=eq.${pay.id}`, {
    status: 'captured', captured_at: nowIso, raw: r, updated_at: nowIso,
  });
  await db.patch('bookings', `id=eq.${encodeURIComponent(bookingId)}`, { payment_status: 'paid' });

  return Response.json({ ok: true });
}
