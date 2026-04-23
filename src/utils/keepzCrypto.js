/**
 * Keepz Hybrid Encryption Utility — Web Crypto API
 *
 * Per Keepz docs (developers.keepz.me/eCommerece integration/cryptography):
 *
 * Outgoing (encryptPayload):
 *   1. Generate random AES-256-CBC key + 16-byte IV
 *   2. Encrypt JSON payload with AES-CBC → encryptedData (base64)
 *   3. Base64-encode AES key → encodedKey
 *   4. Base64-encode IV → encodedIV
 *   5. RSA-OAEP/SHA-256 encrypt the string "encodedKey.encodedIV" → encryptedKeys (base64)
 *
 * Incoming (decryptPayload):
 *   1. RSA-OAEP/SHA-256 decrypt encryptedKeys → "encodedKey.encodedIV"
 *   2. Split on ".", base64-decode each part → raw AES key + IV
 *   3. AES-CBC decrypt encryptedData → JSON
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
 * Encrypts `payload` using Keepz's RSA public key.
 * @param {object} payload
 * @param {string} keepzPublicKeyPem  PEM-encoded RSA public key (SPKI)
 * @returns {{ encryptedData: string, encryptedKeys: string }}  both base64
 */
export async function encryptPayload(payload, keepzPublicKeyPem) {
  const rsaPublicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(keepzPublicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
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

  // Keepz format: Base64(rawAesKey) + "." + Base64(iv) → RSA-encrypt that string
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const encodedKey = toBase64(rawAesKey);
  const encodedIV = toBase64(iv.buffer);
  const keyMaterialStr = `${encodedKey}.${encodedIV}`;

  const encryptedKeysBuffer = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    new TextEncoder().encode(keyMaterialStr),
  );

  return {
    encryptedData: toBase64(encryptedDataBuffer),
    encryptedKeys: toBase64(encryptedKeysBuffer),
  };
}

// ─── incoming ───────────────────────────────────────────────────────────────

/**
 * Decrypts an incoming Keepz webhook payload using AMODY's RSA private key.
 * @param {string} encryptedKeys   base64 RSA-encrypted "Base64Key.Base64IV"
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

  // Decrypt → "Base64Key.Base64IV"
  const keyMaterialBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    fromBase64(encryptedKeys),
  );

  const keyMaterialStr = new TextDecoder().decode(keyMaterialBuffer);
  const dotIndex = keyMaterialStr.lastIndexOf('.');
  const encodedKey = keyMaterialStr.slice(0, dotIndex);
  const encodedIV = keyMaterialStr.slice(dotIndex + 1);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    fromBase64(encodedKey),
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  );

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: fromBase64(encodedIV) },
    aesKey,
    fromBase64(encryptedData),
  );

  return JSON.parse(new TextDecoder().decode(plaintextBuffer));
}
