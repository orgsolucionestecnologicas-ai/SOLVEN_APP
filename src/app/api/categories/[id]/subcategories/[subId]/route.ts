export const dynamic = "force-dynamic";

import {
  deleteSubcategory,
  SubcategoryHasProductsError,
  SubcategoryNotFoundError
} from "../../../../../../modules/categories";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "../../../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  let subId: string, tenantId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ subId }, role] = await Promise.all([params, requireRole(["OWNER", "INVENTORY"], "products")]));
    ({ tenantId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

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
