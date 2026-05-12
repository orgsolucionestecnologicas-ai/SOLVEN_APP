export const dynamic = 'force-dynamic';
import { createProduct, listProducts } from "../../../modules/products";
import {
  type CreateProductInput,
  ProductValidationError
} from "../../../modules/products/product-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../_shared/responses";

export async function GET() {
  try {
    const products = await listProducts();

    return successResponse(products);
  } catch {
    return errorResponse("Could not load products.");
  }
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Product input must be an object.", 400);
  }

  try {
    const product = await createProduct(requestBody as CreateProductInput);

    return successResponse(product, 201);
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return errorResponse("Invalid product input.", 400, error.reasons);
    }

    return errorResponse("Could not save product.");
  }
}
