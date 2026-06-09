export const dynamic = "force-dynamic";
import {
  confirmQuote,
  QuoteAlreadyConfirmedError,
  QuoteExpiredError,
  QuoteNotFoundError,
} from "../../../../../modules/quotes";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse,
} from "../../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"]));
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
  const paymentType = (body as Record<string, unknown>).paymentType as string | undefined;

  if (paymentType && paymentType !== "CASH" && paymentType !== "CREDIT") {
    return errorResponse("El tipo de pago debe ser CASH o CREDIT.", 400);
  }

  try {
    const sale = await confirmQuote(id, tenantId, (paymentType as "CASH" | "CREDIT") ?? "CASH");
    return successResponse(sale);
  } catch (error) {
    if (error instanceof QuoteNotFoundError) return errorResponse(error.message, 404);
    if (error instanceof QuoteAlreadyConfirmedError) return errorResponse(error.message, 409);
    if (error instanceof QuoteExpiredError) return errorResponse(error.message, 409);
    if (error instanceof Error) return errorResponse(error.message, 400);
    return errorResponse("No se pudo confirmar la cotización.");
  }
}
