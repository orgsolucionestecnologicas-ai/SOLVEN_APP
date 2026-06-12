export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { testWsfe, WSFE_URLS } from "@/lib/arca/wsfe-client";
import { ARCAError } from "@/lib/arca";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "../../_shared/responses";
import {
  ForbiddenError,
  requireRole,
  UnauthorizedError,
} from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    const config = await prisma.tenantARCAConfig.findUnique({ where: { tenantId } });
    if (!config) return errorResponse("No hay configuración ARCA para este tenant.", 400);

    const wsfeUrl = WSFE_URLS[config.ambiente as "homo" | "prod"] ?? WSFE_URLS.homo;
    const result = await testWsfe(wsfeUrl);

    return successResponse({
      ambiente: config.ambiente,
      wsfeUrl,
      hasCert: Boolean(config.certEncrypted && config.privateKeyEncrypted),
      wsfe: result,
    });
  } catch (e) {
    if (e instanceof ARCAError) {
      return errorResponse(e.message, 422, [e.code].filter((v): v is string => Boolean(v)));
    }
    return errorResponse("Error al probar conexión ARCA/AFIP.");
  }
}
