// Minimal, dependency-free Supabase REST client for Cloudflare Pages Functions.
// Uses the SERVICE ROLE key (bypasses RLS) — server-side only, never exposed to the browser.
export function sb(env) {
  const base = env.SUPABASE_URL + '/rest/v1';
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
  };
  return {
    async get(path) {
      const r = await fetch(base + path, { headers });
      if (!r.ok) throw new Error('Supabase GET ' + r.status + ' ' + (await r.text()));
      return r.json();
    },
    async insert(table, row) {
      const r = await fetch(base + '/' + table, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      if (!r.ok) throw new Error('Supabase INSERT ' + r.status + ' ' + (await r.text()));
      return r.json();
    },
    async patch(table, query, patch) {
      const r = await fetch(base + '/' + table + '?' + query, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error('Supabase PATCH ' + r.status + ' ' + (await r.text()));
      return r.json();
    },
  };
}
