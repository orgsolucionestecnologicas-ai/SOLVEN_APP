export const dynamic = 'force-dynamic';
import { getDashboardSummary } from "../../../../modules/dashboard";
import { errorResponse, successResponse } from "../../_shared/responses";

export async function GET() {
  try {
    const summary = await getDashboardSummary();

    return successResponse(summary);
  } catch {
    return errorResponse("Could not load dashboard summary.");
  }
}
