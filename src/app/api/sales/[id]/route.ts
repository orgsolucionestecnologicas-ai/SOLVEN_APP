export const dynamic = "force-dynamic";
import { getSaleById, SaleNotFoundError } from "../../../../modules/sales";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"], "pos"));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { id } = await params;

  try {
    const sale = await getSaleById(id, tenantId);
    return successResponse(sale);
  } catch (error) {
    if (error instanceof SaleNotFoundError) return errorResponse(error.message, 404);
    return errorResponse("No se pudo cargar la venta.");
  }
}
