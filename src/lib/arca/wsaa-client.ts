import forge from "node-forge";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { decryptCert } from "./cert-crypto";
import { getCachedToken, saveTokenCache } from "./token-cache";
import type { ARCACredentials } from "./token-cache";
import { ARCAAuthError, ARCAConfigError } from "./arca-errors";
import { prisma } from "@/lib/prisma";

export type { ARCACredentials };

export const WSAA_URLS = {
  homo: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
  prod: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
} as const;

function buildTRA(service: string): string {
  const now = new Date();
  const from = new Date(now.getTime() - 60_000).toISOString();
  const to = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const uniqueId = Math.floor(Math.random() * 2_147_483_647);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<loginTicketRequest version="1.0">` +
    `<header>` +
    `<uniqueId>${uniqueId}</uniqueId>` +
    `<generationTime>${from}</generationTime>` +
    `<expirationTime>${to}</expirationTime>` +
    `</header>` +
    `<service>${service}</service>` +
    `</loginTicketRequest>`
  );
}

function signTRA(tra: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey as forge.pki.rsa.PrivateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign();
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

// Recursively find a key in a parsed XML object
function findDeep(obj: unknown, key: string): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k === key && typeof v === "string") return v;
    const found = findDeep(v, key);
    if (found !== null) return found;
  }
  return null;
}

async function callWSAA(cms: string, url: string): Promise<ARCACredentials> {
  const soapBody =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="LoginCms">` +
    `<SOAP-ENV:Body><ns1:loginCms><ns1:in0>${cms}</ns1:in0></ns1:loginCms></SOAP-ENV:Body>` +
    `</SOAP-ENV:Envelope>`;

  let responseXml: string;
  try {
    const response = await axios.post<string>(url, soapBody, {
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""' },
      timeout: 30_000,
    });
    responseXml = response.data;
  } catch (e) {
    throw new ARCAAuthError("Error al conectar con WSAA AFIP/ARCA", undefined, String(e));
  }

  // Extract loginCmsReturn content using regex — resilient to namespace variations
  const match = responseXml.match(/<(?:[^:>]+:)?loginCmsReturn>([\s\S]*?)<\/(?:[^:>]+:)?loginCmsReturn>/);
  if (!match) {
    throw new ARCAAuthError("Respuesta WSAA inesperada — loginCmsReturn no encontrado", undefined, responseXml.slice(0, 500));
  }

  // Unescape the inner XML
  const innerXml = match[1]!
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, removeNSPrefix: true });
  const inner = parser.parse(innerXml) as Record<string, unknown>;

  const token = findDeep(inner, "token");
  const sign = findDeep(inner, "sign");

  if (!token || !sign) {
    throw new ARCAAuthError("WSAA no devolvió token/sign válidos", undefined, innerXml.slice(0, 300));
  }

  return { token, sign };
}

export async function getARCACredentials(tenantId: string): Promise<ARCACredentials> {
  // 1. Return cached token if still valid
  const cached = await getCachedToken(tenantId);
  if (cached) return cached;

  // 2. Load tenant ARCA config
  const config = await prisma.tenantARCAConfig.findUnique({ where: { tenantId } });
  if (!config) throw new ARCAConfigError("No hay configuración ARCA para este tenant");
  if (!config.certEncrypted || !config.privateKeyEncrypted) {
    throw new ARCAConfigError("Los certificados ARCA no están cargados");
  }

  const encKey = process.env.ARCA_CERT_ENCRYPTION_KEY;
  if (!encKey) throw new ARCAConfigError("ARCA_CERT_ENCRYPTION_KEY no está configurada");

  // 3. Decrypt certificates
  const certPem = decryptCert(config.certEncrypted);
  const keyPem = decryptCert(config.privateKeyEncrypted);

  // 4. Build TRA and sign with PKCS#7
  const tra = buildTRA("wsfe");
  const cms = signTRA(tra, certPem, keyPem);

  // 5. Call WSAA
  const wsaaUrl = WSAA_URLS[config.ambiente as "homo" | "prod"] ?? WSAA_URLS.homo;
  const credentials = await callWSAA(cms, wsaaUrl);

  // 6. Cache for 11 hours (AFIP tokens expire in 12h)
  const expiresAt = new Date(Date.now() + 11 * 60 * 60 * 1000);
  await saveTokenCache(tenantId, credentials, expiresAt);

  return credentials;
}
