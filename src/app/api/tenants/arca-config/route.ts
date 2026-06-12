export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { encryptCert, isValidCertPem, isValidPrivateKeyPem } from "@/lib/arca";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "../../_shared/responses";
import {
  ForbiddenError,
  requireRole,
  requireTenantId,
  UnauthorizedError,
} from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const config = await prisma.tenantARCAConfig.findUnique({
    where: { tenantId },
  });

  if (!config) return successResponse(null);

  // Nunca exponer certEncrypted ni privateKeyEncrypted
  return successResponse({
    cuit: config.cuit,
    puntoVenta: config.puntoVenta,
    condicionIVA: config.condicionIVA,
    ambiente: config.ambiente,
    hasCert: config.certEncrypted != null,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON inválido.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("El cuerpo debe ser un objeto JSON.", 400);
  }

  const { cuit, puntoVenta, condicionIVA, ambiente, certPem, privateKeyPem } =
    body as Record<string, unknown>;

  if (typeof cuit !== "string" || !/^\d{11}$/.test(cuit)) {
    return errorResponse("CUIT inválido. Debe ser 11 dígitos sin guiones.", 400);
  }
  if (typeof puntoVenta !== "number" || puntoVenta < 1 || puntoVenta > 9999) {
    return errorResponse("puntoVenta debe ser un número entre 1 y 9999.", 400);
  }
  if (condicionIVA !== "RI" && condicionIVA !== "MONO") {
    return errorResponse("condicionIVA debe ser 'RI' o 'MONO'.", 400);
  }
  if (ambiente !== undefined && ambiente !== "homo" && ambiente !== "prod") {
    return errorResponse("ambiente debe ser 'homo' o 'prod'.", 400);
  }

  let certEncrypted: string | undefined;
  let privateKeyEncrypted: string | undefined;

  if (certPem !== undefined || privateKeyPem !== undefined) {
    if (typeof certPem !== "string" || !isValidCertPem(certPem)) {
      return errorResponse("certPem no es un certificado X.509 PEM válido.", 400);
    }
    if (typeof privateKeyPem !== "string" || !isValidPrivateKeyPem(privateKeyPem)) {
      return errorResponse("privateKeyPem no es una clave privada PEM válida.", 400);
    }
    try {
      certEncrypted = encryptCert(certPem);
      privateKeyEncrypted = encryptCert(privateKeyPem);
    } catch {
      return errorResponse(
        "Error al encriptar el certificado. Verificar ARCA_CERT_ENCRYPTION_KEY.",
        500
      );
    }
  }

  const updateData = {
    cuit: cuit as string,
    puntoVenta: puntoVenta as number,
    condicionIVA: condicionIVA as string,
    ambiente: (ambiente as string | undefined) ?? "homo",
    ...(certEncrypted !== undefined && { certEncrypted }),
    ...(privateKeyEncrypted !== undefined && { privateKeyEncrypted }),
  };

  await prisma.tenantARCAConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...updateData },
    update: updateData,
  });

  const updated = await prisma.tenantARCAConfig.findUnique({
    where: { tenantId },
  });

  // Nunca exponer certEncrypted ni privateKeyEncrypted en la respuesta
  return successResponse({
    cuit: updated!.cuit,
    puntoVenta: updated!.puntoVenta,
    condicionIVA: updated!.condicionIVA,
    ambiente: updated!.ambiente,
    hasCert: updated!.certEncrypted != null,
    createdAt: updated!.createdAt,
    updatedAt: updated!.updatedAt,
  });
}
