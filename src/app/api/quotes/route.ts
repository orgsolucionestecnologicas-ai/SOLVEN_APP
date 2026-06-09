export const dynamic = "force-dynamic";
import {
  createQuote,
  listQuotes,
  QuoteValidationError,
  type CreateQuoteInput,
} from "../../../modules/quotes";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  paginatedResponse,
  successResponse,
  unauthorizedResponse,
} from "../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";

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
  const status = searchParams.get("status") ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const result = await listQuotes(tenantId, { page, limit, from, to, status, customerId, search });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar las cotizaciones.");
  }
}

export async function POST(request: Request) {
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

  try {
    const quote = await createQuote(body as CreateQuoteInput, tenantId);
    return successResponse(quote, 201);
  } catch (error) {
    if (error instanceof QuoteValidationError) {
      return errorResponse("Datos de cotización inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudo crear la cotización.");
  }
}
