export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../_shared/responses";
import {
  ForbiddenError,
  requireRole,
  UnauthorizedError,
} from "@/lib/tenant";

export async function DELETE() {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const config = await prisma.tenantARCAConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return errorResponse("No hay configuración ARCA para este tenant.", 404);
  }

  await prisma.tenantARCAConfig.update({
    where: { tenantId },
    data: {
      certEncrypted: null,
      privateKeyEncrypted: null,
    },
  });

  return successResponse({
    message: "Certificado ARCA eliminado correctamente.",
  });
}
