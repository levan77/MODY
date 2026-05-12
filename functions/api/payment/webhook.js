import { createClient } from '@supabase/supabase-js';
import { buildSignature } from '../../utils/flittSignature.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { signature: received, ...params } = body;
  const expected = await buildSignature(env.FLITT_SECRET_KEY, params);
  if (expected !== received) {
    return new Response('Bad signature', { status: 400 });
  }

  const paymentStatus = body.order_status === 'approved' ? 'paid' : 'failed';
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from('bookings')
    .update({ payment_status: paymentStatus, flitt_order_id: body.payment_id })
    .eq('id', body.order_id);

  return new Response(null, { status: 200 });
}
