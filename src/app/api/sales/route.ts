export const dynamic = 'force-dynamic';
import {
  createSale,
  type CreateSaleWithPromotionsInput,
  listSales,
  SaleInsufficientStockError,
  SaleNoCashRegisterOpenError,
  SaleProductNotFoundError
} from "../../../modules/sales";
import { SaleValidationError } from "../../../modules/sales/sale-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  paginatedResponse,
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  const tenantId = await requireTenantId();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  try {
    const result = await listSales(tenantId, { page, limit });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar las ventas.");
  }
}

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
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
    const sale = await createSale(requestBody as CreateSaleWithPromotionsInput, tenantId);
    return successResponse(sale, 201);
  } catch (error) {
    if (error instanceof SaleNoCashRegisterOpenError) {
      return errorResponse(error.message, 409);
    }
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
