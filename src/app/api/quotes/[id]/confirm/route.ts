export const dynamic = "force-dynamic";
import {
  confirmQuote,
  QuoteAlreadyConfirmedError,
  QuoteExpiredError,
  QuoteNotFoundError,
  QuoteValidationError,
} from "../../../../../modules/quotes";
import { CashRegisterNoSessionOpenError } from "../../../../../modules/cash-register";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse,
} from "../../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let tenantId: string;
  let userId: string;
  try {
    ({ tenantId, userId } = await requireRole(["OWNER", "CASHIER"], "quotes"));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) return errorResponse("El cuerpo debe ser un objeto.", 400);

  const { id } = await params;
  const paymentMethod = (body as { paymentMethod?: unknown }).paymentMethod ?? "Efectivo";

  try {
    const sale = await confirmQuote(id, tenantId, paymentMethod);
    void logAudit({
      tenantId,
      userId,
      userCode: sale.sellerCode,
      action: "QUOTE_CONFIRMED",
      entityType: "Quote",
      entityId: id,
      metadata: { saleId: sale.id, folio: sale.folio, paymentType: sale.paymentType },
    });
    return successResponse(sale);
  } catch (error) {
    if (error instanceof QuoteNotFoundError) return errorResponse(error.message, 404);
    if (error instanceof QuoteAlreadyConfirmedError) return errorResponse(error.message, 409);
    if (error instanceof QuoteExpiredError) return errorResponse(error.message, 409);
    if (error instanceof CashRegisterNoSessionOpenError) return errorResponse(error.message, 409);
    if (error instanceof QuoteValidationError) return errorResponse(error.message, 400, error.reasons);
    if (error instanceof Error) return errorResponse(error.message, 400);
    return errorResponse("No se pudo confirmar la cotización.");
  }
}
