export const dynamic = 'force-dynamic';
import { listInventoryMovements } from "../../../modules/inventory";
import { errorResponse, successResponse } from "../_shared/responses";

export async function GET() {
  try {
    const movements = await listInventoryMovements();
    return successResponse(movements);
  } catch {
    return errorResponse("No se pudieron cargar los movimientos de inventario.");
  }
}
