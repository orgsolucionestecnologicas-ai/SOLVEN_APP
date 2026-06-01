export const dynamic = "force-dynamic";

import {
  deleteSubcategory,
  SubcategoryHasProductsError,
  SubcategoryNotFoundError
} from "../../../../../../modules/categories";
import { errorResponse, successResponse } from "../../../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const [{ subId }, tenantId] = await Promise.all([params, requireTenantId()]);

  try {
    await deleteSubcategory(subId, tenantId);
    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof SubcategoryNotFoundError) {
      return errorResponse("Subcategoría no encontrada.", 404);
    }
    if (error instanceof SubcategoryHasProductsError) {
      return errorResponse(error.message, 400);
    }
    return errorResponse("No se pudo eliminar la subcategoría.");
  }
}
