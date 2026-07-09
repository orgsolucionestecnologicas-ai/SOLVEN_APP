export const dynamic = "force-dynamic";

import { listAuditLogsByEntity } from "@/modules/audit";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../_shared/responses";
import { UnauthorizedError, requireTenantId } from "@/lib/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    ([{ id }, tenantId] = await Promise.all([params, requireTenantId()]));
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const history = await listAuditLogsByEntity("Product", id, tenantId);
    return successResponse(history);
  } catch {
    return errorResponse("No se pudo cargar el historial de precios.");
  }
}
