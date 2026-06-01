import bcrypt from "bcryptjs";

const COOKIE_NAME = "solven_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export { COOKIE_MAX_AGE, COOKIE_NAME };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

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

type SessionPayload = { userId: string; tenantId: string };

export async function createSession(
  userId: string,
  tenantId: string
): Promise<string> {
  const key = await getHmacKey();
  const payload = btoa(JSON.stringify({ userId, tenantId } satisfies SessionPayload));
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

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
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
    return JSON.parse(atob(payload)) as SessionPayload;
  } catch {
    return null;
  }
}
