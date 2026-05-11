export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Shim: index.html submitBooking() still calls this endpoint.
    // Returns a safe redirect so bookings survive and Twilio fires.
    // Remove once index.html Keepz block is manually deleted.
    if (url.pathname === '/api/payment/initiate' && request.method === 'POST') {
      return Response.json({ paymentUrl: url.origin + '/' });
    }

    return env.ASSETS.fetch(request);
  },
};
