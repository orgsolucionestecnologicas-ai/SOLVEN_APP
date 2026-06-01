export const dynamic = 'force-dynamic';
import { listSessions } from "../../../../modules/cash-register";
import { errorResponse, successResponse } from "../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const sessions = await listSessions(tenantId);
    return successResponse(sessions);
  } catch {
    return errorResponse("No se pudieron obtener las sesiones de caja.");
  }
}
