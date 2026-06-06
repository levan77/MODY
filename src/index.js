export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve the Google Search Console verification file directly with a 200,
    // bypassing Cloudflare's automatic ".html" → extensionless 307 redirect
    // (Google's HTML-file verification requires a direct 200 at the exact URL).
    if (url.pathname === "/google4c12aca633d05da5.html") {
      return new Response("google-site-verification: google4c12aca633d05da5.html", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
