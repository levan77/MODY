/**
 * Keepz Hybrid Encryption Utility — Web Crypto API
 *
 * Outgoing: AES-256-CBC encrypts the payload; RSA-OAEP/SHA-256 encrypts
 *           the concatenated AES key (32 b) + IV (16 b) for key transport.
 *
 * Incoming: RSA-OAEP/SHA-256 decrypts the key material; AES-256-CBC
 *           decrypts the payload using the recovered key + IV.
 *
 * MGF1 note: Java's OAEPWithSHA-256AndMGF1Padding uses SHA-1 for MGF1 by
 * default. Web Crypto API ties MGF1 to the same hash as the label hash.
 * Using SHA-1 here matches Java's default OAEP behaviour (hash=SHA-256, mgf1=SHA-1)
 * which is what Keepz's backend almost certainly uses.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ─── outgoing ───────────────────────────────────────────────────────────────

/**
 * Encrypts `payload` (plain object) using Keepz's RSA public key.
 * @param {object} payload
 * @param {string} keepzPublicKeyPem  PEM-encoded RSA public key (SPKI)
 * @returns {{ encryptedData: string, encryptedKeys: string }}  both base64
 */
export async function encryptPayload(payload, keepzPublicKeyPem) {
  // SHA-1 matches Java's OAEPWithSHA-256AndMGF1Padding default (SHA-1 for MGF1)
  const rsaPublicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(keepzPublicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-1' },
    false,
    ['encrypt'],
  );

  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-CBC', length: 256 },
    true,
    ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(16));

  const encryptedDataBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(payload)),
  );

  // Concat raw AES key (32 bytes) + IV (16 bytes) → 48-byte key material
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const keyMaterial = new Uint8Array(48);
  keyMaterial.set(new Uint8Array(rawAesKey), 0);
  keyMaterial.set(iv, 32);

  const encryptedKeysBuffer = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    keyMaterial,
  );

  return {
    encryptedData: toBase64(encryptedDataBuffer),
    encryptedKeys: toBase64(encryptedKeysBuffer),
  };
}

// ─── incoming ───────────────────────────────────────────────────────────────

/**
 * Decrypts an incoming Keepz webhook payload using AMODY's RSA private key.
 * @param {string} encryptedKeys   base64 RSA-encrypted key material
 * @param {string} encryptedData   base64 AES-encrypted payload
 * @param {string} amodyPrivateKeyPem  PEM-encoded RSA private key (PKCS#8)
 * @returns {object}  parsed JSON payload from Keepz
 */
export async function decryptPayload(encryptedKeys, encryptedData, amodyPrivateKeyPem) {
  const rsaPrivateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(amodyPrivateKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  );

  const keyMaterialBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    fromBase64(encryptedKeys),
  );

  // Split 48-byte material: [0..31] = AES key, [32..47] = IV
  const keyMaterial = new Uint8Array(keyMaterialBuffer);
  const rawAesKey = keyMaterial.slice(0, 32);
  const iv = keyMaterial.slice(32, 48);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  );

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    aesKey,
    fromBase64(encryptedData),
  );

  return JSON.parse(new TextDecoder().decode(plaintextBuffer));
}
