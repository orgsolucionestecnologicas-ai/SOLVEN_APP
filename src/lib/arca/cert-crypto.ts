import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const keyHex = process.env.ARCA_CERT_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "ARCA_CERT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encripta un texto plano (PEM de certificado o clave privada) con AES-256-GCM.
 * Formato del resultado: iv(12B) + authTag(16B) + ciphertext, todo en base64.
 * NUNCA loguear el plaintext ni el resultado con datos reales.
 */
export function encryptCert(plaintext: string): string {
  const KEY = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Desencripta un valor producido por encryptCert.
 * Lanza error si el tag de autenticación no coincide (integridad comprometida).
 */
export function decryptCert(encryptedBase64: string): string {
  const KEY = getKey();
  const buf = Buffer.from(encryptedBase64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/** Valida estructura PEM de certificado X.509. */
export function isValidCertPem(pem: string): boolean {
  return /^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\s*$/.test(
    pem.trim()
  );
}

/** Valida estructura PEM de clave privada (RSA, EC o PKCS#8). */
export function isValidPrivateKeyPem(pem: string): boolean {
  return /^-----BEGIN (RSA |EC )?PRIVATE KEY-----[\s\S]+-----END (RSA |EC )?PRIVATE KEY-----\s*$/.test(
    pem.trim()
  );
}
