export const dynamic = 'force-dynamic';
import { getDashboardSummary } from "../../../../modules/dashboard";
import { errorResponse, successResponse } from "../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const summary = await getDashboardSummary(tenantId);
    return successResponse(summary);
  } catch {
    return errorResponse("Could not load dashboard summary.");
  }
}
