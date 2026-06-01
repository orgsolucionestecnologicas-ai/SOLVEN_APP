export const dynamic = "force-dynamic";

import {
  CategoryHasProductsError,
  CategoryHasSubcategoriesError,
  CategoryNotFoundError,
  deleteCategory
} from "../../../../modules/categories";
import { errorResponse, successResponse } from "../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, tenantId] = await Promise.all([params, requireTenantId()]);

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
