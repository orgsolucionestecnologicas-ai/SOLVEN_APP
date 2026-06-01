export const dynamic = 'force-dynamic';
import { getActivePromotions } from "../../../../modules/promotions";
import { errorResponse, successResponse } from "../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const promotions = await getActivePromotions(tenantId);
    return successResponse(promotions);
  } catch {
    return errorResponse("No se pudieron cargar las promociones activas.");
  }
}
