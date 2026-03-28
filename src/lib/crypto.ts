/**
 * SHA256 hash a string and return hex-encoded digest.
 * Uses Web Crypto API (available in Workers and modern Node).
 */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
