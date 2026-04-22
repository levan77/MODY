import { handleInitiate } from './routes/initiate.js';
import { handleWebhook } from './routes/webhook.js';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/payment/initiate' && request.method === 'POST') {
      return handleInitiate(request, env, ctx);
    }

    if (pathname === '/api/payment/webhook' && request.method === 'POST') {
      return handleWebhook(request, env, ctx);
    }

    // All other requests fall through to the static assets
    return env.ASSETS.fetch(request);
  },
};
