export const dynamic = 'force-dynamic';
import {
  createPromotion,
  listPromotions,
  PromotionValidationError,
  type CreatePromotionInput
} from "../../../modules/promotions";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const promotions = await listPromotions(tenantId);
    return successResponse(promotions);
  } catch {
    return errorResponse("No se pudieron cargar las promociones.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Los datos de la promoción deben ser un objeto.", 400);
  }

  try {
    const promotion = await createPromotion(requestBody as CreatePromotionInput, tenantId);
    return successResponse(promotion, 201);
  } catch (error) {
    if (error instanceof PromotionValidationError) {
      return errorResponse("Datos de promoción inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudo guardar la promoción.");
  }
}
