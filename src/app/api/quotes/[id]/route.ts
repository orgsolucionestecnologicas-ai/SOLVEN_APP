export const dynamic = "force-dynamic";
import {
  cancelQuote,
  getQuoteById,
  QuoteAlreadyConfirmedError,
  QuoteNotFoundError,
} from "../../../../modules/quotes";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "../../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { id } = await params;

  try {
    const quote = await getQuoteById(id, tenantId);
    return successResponse(quote);
  } catch (error) {
    if (error instanceof QuoteNotFoundError) return errorResponse(error.message, 404);
    return errorResponse("No se pudo obtener la cotización.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"], "quotes"));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { id } = await params;

  try {
    const quote = await cancelQuote(id, tenantId);
    return successResponse(quote);
  } catch (error) {
    if (error instanceof QuoteNotFoundError) return errorResponse(error.message, 404);
    if (error instanceof QuoteAlreadyConfirmedError) return errorResponse(error.message, 409);
    return errorResponse("No se pudo cancelar la cotización.");
  }
}
