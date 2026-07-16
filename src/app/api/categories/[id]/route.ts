export const dynamic = "force-dynamic";

import {
  CategoryHasProductsError,
  CategoryHasSubcategoriesError,
  CategoryNotFoundError,
  deleteCategory
} from "../../../../modules/categories";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER", "INVENTORY"])]));
    ({ tenantId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    await deleteCategory(id, tenantId);
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof CategoryNotFoundError) {
      return errorResponse("Categoría no encontrada.", 404);
    }
    if (error instanceof CategoryHasProductsError) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof CategoryHasSubcategoriesError) {
      return errorResponse(error.message, 400);
    }
    return errorResponse("No se pudo eliminar la categoría.");
  }
}
