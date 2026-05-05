const COOKIE_NAME = "solven_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

async function getHmacKey(): Promise<CryptoKey> {
  const secret = process.env.SOLVEN_SESSION_SECRET ?? "";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(username: string): Promise<string> {
  const key = await getHmacKey();
  const payload = btoa(username);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${sigHex}`;
}

export async function verifySessionToken(token: string): Promise<string | null> {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payload = token.slice(0, dotIndex);
  const sigHex = token.slice(dotIndex + 1);

  if (sigHex.length % 2 !== 0) return null;

  const sigBytes = new Uint8Array(sigHex.length / 2);
  for (let i = 0; i < sigHex.length; i += 2) {
    sigBytes[i / 2] = parseInt(sigHex.slice(i, i + 2), 16);
  }

  const key = await getHmacKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(payload)
  );

  if (!valid) return null;

  try {
    return atob(payload);
  } catch {
    return null;
  }
}

export { COOKIE_MAX_AGE, COOKIE_NAME };
