export const dynamic = 'force-dynamic';
import { getPromotionRanking } from "../../../../modules/promotions";
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
    const ranking = await getPromotionRanking(tenantId);
    return successResponse(ranking);
  } catch {
    return errorResponse("No se pudo cargar el ranking de promociones.");
  }
}
