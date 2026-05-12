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

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Stock adjustment input must be an object.", 400);
  }

  try {
    const result = await adjustProductStock(
      requestBody as AdjustProductStockInput
    );

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof StockAdjustmentValidationError) {
      return errorResponse(
        "Invalid stock adjustment input.",
        400,
        error.reasons
      );
    }

    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Product was not found.", 400);
    }

    return errorResponse("Could not save stock adjustment.");
  }
}
