export const dynamic = 'force-dynamic';
import { listInventoryMovements } from "../../../modules/inventory";
import { errorResponse, successResponse } from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const movements = await listInventoryMovements(tenantId);
    return successResponse(movements);
  } catch {
    return errorResponse("No se pudieron cargar los movimientos de inventario.");
  }
}
