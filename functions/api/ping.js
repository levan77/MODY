// Diagnostic: no imports. If GET /api/ping returns "pong", Pages Functions work.
export async function onRequest() {
  return new Response('pong', { headers: { 'content-type': 'text/plain' } });
}
