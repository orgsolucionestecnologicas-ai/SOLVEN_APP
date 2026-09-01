export const dynamic = "force-dynamic";
import {
  duplicateQuote,
  QuoteNotFoundError,
} from "../../../../../modules/quotes";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

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

  const { id } = await params;

  try {
    const quote = await duplicateQuote(id, tenantId, userId);
    return successResponse(quote, 201);
  } catch (error) {
    if (error instanceof QuoteNotFoundError) return errorResponse(error.message, 404);
    return errorResponse("No se pudo duplicar la cotización.");
  }
}
