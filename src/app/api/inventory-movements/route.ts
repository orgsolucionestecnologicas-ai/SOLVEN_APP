export const dynamic = 'force-dynamic';
import { listInventoryMovements } from "../../../modules/inventory";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "INVENTORY"], "products"));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    const movements = await listInventoryMovements(tenantId);
    return successResponse(movements);
  } catch {
    return errorResponse("No se pudieron cargar los movimientos de inventario.");
  }
}
