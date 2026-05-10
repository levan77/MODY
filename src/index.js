export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Temporary shim: index.html still calls this endpoint after booking insert.
    // Returns a redirect to home so the booking survives and Twilio fires.
    // Remove this handler once index.html is updated to remove the Keepz block.
    if (url.pathname === '/api/payment/initiate' && request.method === 'POST') {
      return Response.json({ paymentUrl: url.origin + '/' });
    }

    return env.ASSETS.fetch(request);
  },
};
