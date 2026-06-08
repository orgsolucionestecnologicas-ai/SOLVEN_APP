export const dynamic = 'force-dynamic';
import {
  deletePromotion,
  getPromotionById,
  PromotionHasUsagesError,
  PromotionNotFoundError,
  PromotionValidationError,
  type UpdatePromotionInput,
  updatePromotion
} from "../../../../modules/promotions";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";

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
    const promotion = await getPromotionById(id, tenantId);
    return successResponse(promotion);
  } catch (error) {
    if (error instanceof PromotionNotFoundError) {
      return errorResponse(error.message, 404);
    }
    return errorResponse("No se pudo cargar la promoción.");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER"])]));
    ({ tenantId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) {
    return errorResponse("Los datos de actualización deben ser un objeto.", 400);
  }

  try {
    const promotion = await updatePromotion(id, body as UpdatePromotionInput, tenantId);
    return successResponse(promotion);
  } catch (error) {
    if (error instanceof PromotionValidationError) {
      return errorResponse("Datos de promoción inválidos.", 400, error.reasons);
    }
    if (error instanceof PromotionNotFoundError) {
      return errorResponse(error.message, 404);
    }
    return errorResponse("No se pudo actualizar la promoción.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER"])]));
    ({ tenantId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    await deletePromotion(id, tenantId);
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof PromotionNotFoundError) {
      return errorResponse(error.message, 404);
    }
    if (error instanceof PromotionHasUsagesError) {
      return errorResponse(error.message, 400);
    }
    return errorResponse("No se pudo eliminar la promoción.");
  }
}
