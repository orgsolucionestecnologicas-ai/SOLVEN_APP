export const dynamic = 'force-dynamic';
import { getDashboardSummary } from "../../../../modules/dashboard";
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
    const summary = await getDashboardSummary(tenantId);
    return successResponse(summary);
  } catch {
    return errorResponse("Could not load dashboard summary.");
  }
}
