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
  forbiddenResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  paginatedResponse,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : undefined;
  const sellerCode = searchParams.get("sellerCode") ?? undefined;
  try {
    const result = await listSales(tenantId, { page, limit, from, to, sellerCode });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar las ventas.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  let userId: string;
  try {
    ({ tenantId, userId } = await requireRole(["OWNER", "CASHIER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
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
    void logAudit({
      tenantId,
      userId,
      userCode: sale.sellerCode,
      action: "SALE_CREATED",
      entityType: "Sale",
      entityId: sale.id,
      metadata: {
        folio: sale.folio,
        receiptType: sale.receiptType,
        receiptNumber: sale.receiptNumber,
        totalAmount: sale.totalAmount.toString(),
        paymentType: sale.paymentType
      }
    });
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
