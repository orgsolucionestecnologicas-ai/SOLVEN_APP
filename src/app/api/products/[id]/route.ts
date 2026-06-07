export const dynamic = 'force-dynamic';
import {
  getProductById,
  updateProduct,
  ProductValidationError,
  type UpdateProductInput
} from "../../../../modules/products";
import {
  errorResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse
} from "../../_shared/responses";
import { requireRole, requireTenantId } from "@/lib/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, tenantId] = await Promise.all([params, requireTenantId()]);
  try {
    const product = await getProductById(id, tenantId);
    if (!product) return errorResponse("Producto no encontrado.", 404);
    return successResponse(product);
  } catch {
    return errorResponse("No se pudo cargar el producto.");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, { tenantId }] = await Promise.all([params, requireRole(["OWNER", "INVENTORY"])]);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) {
    return errorResponse("Product update input must be an object.", 400);
  }

  try {
    const product = await updateProduct(id, body as UpdateProductInput, tenantId);
    return successResponse(product);
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return errorResponse("Invalid product input.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Producto no encontrado.", 404);
    }
    return errorResponse("No se pudo actualizar el producto.");
  }
}
