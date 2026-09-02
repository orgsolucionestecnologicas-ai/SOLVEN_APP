export const dynamic = 'force-dynamic';
import { getExpiringPromotions } from "../../../../modules/promotions";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    const promotions = await getExpiringPromotions(tenantId, 48);
    return successResponse(promotions);
  } catch {
    return errorResponse("No se pudieron cargar las promociones próximas a vencer.");
  }
}
