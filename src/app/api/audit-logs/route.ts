export const dynamic = 'force-dynamic';
import { listAuditLogs } from "@/modules/audit";
import {
  errorResponse,
  forbiddenResponse,
  paginatedResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const action = searchParams.get("action") ?? undefined;

  try {
    const result = await listAuditLogs(tenantId, { page, limit, action });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar los registros de auditoría.");
  }
}
