export const dynamic = 'force-dynamic';
import {
  getPromotionUsageHistory,
  PromotionNotFoundError
} from "../../../../../modules/promotions";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse
} from "../../../_shared/responses";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    ([{ id }, tenantId] = await Promise.all([params, requireTenantId()]));
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    const usages = await getPromotionUsageHistory(id, tenantId);
    return successResponse(usages);
  } catch (error) {
    if (error instanceof PromotionNotFoundError) {
      return errorResponse(error.message, 404);
    }
    return errorResponse("No se pudo cargar el historial de uso de la promoción.");
  }
}
