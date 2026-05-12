export async function buildSignature(secretKey, params) {
  const sorted = Object.keys(params).sort()
    .filter(k => params[k] !== '' && params[k] != null)
    .map(k => String(params[k]));
  const data = [secretKey, ...sorted].join('|');
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
