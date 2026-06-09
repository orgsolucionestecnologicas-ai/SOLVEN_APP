export const dynamic = "force-dynamic";
import { getExpiringQuotes } from "../../../../modules/quotes";
import { errorResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    const quotes = await getExpiringQuotes(tenantId, 24);
    return successResponse(quotes);
  } catch {
    return errorResponse("No se pudieron cargar las cotizaciones próximas a vencer.");
  }
}
