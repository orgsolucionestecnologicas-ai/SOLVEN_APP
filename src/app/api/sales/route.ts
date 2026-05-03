import {
  createSale,
  listSales,
  SaleInsufficientStockError,
  SaleProductNotFoundError
} from "../../../modules/sales";
import {
  type CreateSaleInput,
  SaleValidationError
} from "../../../modules/sales/sale-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse
} from "../_shared/responses";

export async function GET() {
  try {
    const sales = await listSales();

    return successResponse(sales);
  } catch {
    return errorResponse("Could not load sales.");
  }
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Sale input must be an object.", 400);
  }

  try {
    const sale = await createSale(requestBody as CreateSaleInput);

    return successResponse(sale, 201);
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return errorResponse("Invalid sale input.", 400, error.reasons);
    }

    if (
      error instanceof SaleProductNotFoundError ||
      error instanceof SaleInsufficientStockError
    ) {
      return errorResponse(error.message, 400);
    }

    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Customer was not found.", 400);
    }

    return errorResponse("Could not save sale.");
  }
}
