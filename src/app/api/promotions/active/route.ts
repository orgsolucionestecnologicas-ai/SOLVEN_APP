export const dynamic = 'force-dynamic';
import { getActivePromotions } from "../../../../modules/promotions";
import { errorResponse, successResponse } from "../../_shared/responses";

export async function GET() {
  try {
    const promotions = await getActivePromotions();

    return successResponse(promotions);
  } catch {
    return errorResponse("No se pudieron cargar las promociones activas.");
  }
}
