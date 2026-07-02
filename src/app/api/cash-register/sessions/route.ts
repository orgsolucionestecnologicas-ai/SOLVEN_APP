export const dynamic = 'force-dynamic';
import { listClosedSessions } from "../../../../modules/cash-register";
import { errorResponse, paginatedResponse, unauthorizedResponse } from "../../_shared/responses";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";

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
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  try {
    const result = await listClosedSessions(tenantId, { page, limit });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron obtener las sesiones de caja.");
  }
}
