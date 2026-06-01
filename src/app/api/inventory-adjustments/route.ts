export const dynamic = 'force-dynamic';
import {
  adjustProductStock,
  type AdjustProductStockInput,
  StockAdjustmentValidationError
} from "../../../modules/inventory";
import {
  errorResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("El ajuste de stock debe ser un objeto.", 400);
  }

  try {
    const result = await adjustProductStock(
      requestBody as AdjustProductStockInput,
      tenantId
    );
    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof StockAdjustmentValidationError) {
      return errorResponse("Los datos del ajuste de stock son inválidos.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("El producto no fue encontrado.", 400);
    }
    return errorResponse("No se pudo guardar el ajuste de stock.");
  }
}
