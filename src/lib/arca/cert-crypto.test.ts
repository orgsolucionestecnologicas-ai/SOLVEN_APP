import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { encryptCert, decryptCert, isValidCertPem, isValidPrivateKeyPem } from "./cert-crypto";

// Clave dummy de 64 hex chars para tests (32 bytes)
const TEST_KEY = "a".repeat(64);

describe("cert-crypto", () => {
  beforeAll(() => {
    process.env.ARCA_CERT_ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    delete process.env.ARCA_CERT_ENCRYPTION_KEY;
  });

  it("encripta y desencripta texto correctamente", () => {
    const original = "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----";
    const encrypted = encryptCert(original);
    expect(encrypted).not.toBe(original);
    const decrypted = decryptCert(encrypted);
    expect(decrypted).toBe(original);
  });

  it("encripta el mismo texto dos veces produciendo resultados distintos (IV aleatorio)", () => {
    const text = "test-cert-content";
    const enc1 = encryptCert(text);
    const enc2 = encryptCert(text);
    expect(enc1).not.toBe(enc2);
  });

  it("falla al desencriptar si se modifica un byte del ciphertext", () => {
    const original = "plaintext-test";
    const encrypted = encryptCert(original);
    const buf = Buffer.from(encrypted, "base64");
    buf[buf.length - 1] ^= 0xff; // corromper último byte
    const corrupted = buf.toString("base64");
    expect(() => decryptCert(corrupted)).toThrow();
  });

  it("lanza error si ARCA_CERT_ENCRYPTION_KEY no está definida", () => {
    const saved = process.env.ARCA_CERT_ENCRYPTION_KEY;
    delete process.env.ARCA_CERT_ENCRYPTION_KEY;
    expect(() => encryptCert("test")).toThrow("ARCA_CERT_ENCRYPTION_KEY");
    process.env.ARCA_CERT_ENCRYPTION_KEY = saved;
  });

  describe("isValidCertPem", () => {
    it("acepta un PEM de certificado válido", () => {
      const pem = "-----BEGIN CERTIFICATE-----\nMIIBtest==\n-----END CERTIFICATE-----";
      expect(isValidCertPem(pem)).toBe(true);
    });
    it("rechaza texto sin cabecera PEM", () => {
      expect(isValidCertPem("not a cert")).toBe(false);
    });
    it("rechaza un PEM de clave privada", () => {
      const pem = "-----BEGIN PRIVATE KEY-----\ndata\n-----END PRIVATE KEY-----";
      expect(isValidCertPem(pem)).toBe(false);
    });
  });

  describe("isValidPrivateKeyPem", () => {
    it("acepta PKCS#8 PRIVATE KEY", () => {
      const pem = "-----BEGIN PRIVATE KEY-----\nMIIEtest==\n-----END PRIVATE KEY-----";
      expect(isValidPrivateKeyPem(pem)).toBe(true);
    });
    it("acepta RSA PRIVATE KEY", () => {
      const pem = "-----BEGIN RSA PRIVATE KEY-----\ndata\n-----END RSA PRIVATE KEY-----";
      expect(isValidPrivateKeyPem(pem)).toBe(true);
    });
    it("rechaza texto sin cabecera PEM", () => {
      expect(isValidPrivateKeyPem("not a key")).toBe(false);
    });
  });
});
