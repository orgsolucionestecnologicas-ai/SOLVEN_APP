export const dynamic = "force-dynamic";

import {
  CategoryNotFoundError,
  CategoryValidationError,
  createSubcategory
} from "../../../../../modules/categories";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let categoryId: string, tenantId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id: categoryId }, role] = await Promise.all([
      params,
      requireRole(["OWNER", "INVENTORY"], "products")
    ]));
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
    return errorResponse("Los datos de la subcategoría deben ser un objeto.", 400);
  }

  const input = body as Record<string, unknown>;

  try {
    const subcategory = await createSubcategory(input.name as string, categoryId, tenantId);
    return successResponse(subcategory, 201);
  } catch (error) {
    if (error instanceof CategoryValidationError) {
      return errorResponse("Datos de subcategoría inválidos.", 400, error.reasons);
    }
    if (error instanceof CategoryNotFoundError) {
      return errorResponse("Categoría no encontrada.", 404);
    }
    return errorResponse("No se pudo guardar la subcategoría.");
  }
}
