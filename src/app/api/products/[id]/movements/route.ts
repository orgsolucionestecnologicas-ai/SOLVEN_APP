export const dynamic = "force-dynamic";

import { listInventoryMovementsByProduct } from "@/modules/inventory";
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
    const movements = await listInventoryMovementsByProduct(id, tenantId);
    return successResponse(movements);
  } catch {
    return errorResponse("No se pudieron cargar los movimientos.");
  }
}
