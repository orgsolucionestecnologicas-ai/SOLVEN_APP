export const dynamic = 'force-dynamic';
import {
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
    const product = await updateProduct(id, body as UpdateProductInput);

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
