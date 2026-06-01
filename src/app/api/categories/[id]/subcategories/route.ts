export const dynamic = "force-dynamic";

import {
  CategoryNotFoundError,
  CategoryValidationError,
  createSubcategory
} from "../../../../../modules/categories";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id: categoryId }, tenantId] = await Promise.all([params, requireTenantId()]);

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
