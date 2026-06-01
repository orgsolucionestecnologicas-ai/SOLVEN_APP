export const dynamic = "force-dynamic";

import { createCategory, listCategories } from "../../../modules/categories";
import { CategoryValidationError } from "../../../modules/categories/category-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const categories = await listCategories(tenantId);
    return successResponse(categories);
  } catch {
    return errorResponse("No se pudieron cargar las categorías.");
  }
}

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) {
    return errorResponse("Los datos de la categoría deben ser un objeto.", 400);
  }

  const input = body as Record<string, unknown>;

  try {
    const category = await createCategory(input.name as string, tenantId);
    return successResponse(category, 201);
  } catch (error) {
    if (error instanceof CategoryValidationError) {
      return errorResponse("Datos de categoría inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudo guardar la categoría.");
  }
}
