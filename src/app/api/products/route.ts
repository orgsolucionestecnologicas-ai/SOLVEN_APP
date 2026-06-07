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
  paginatedResponse,
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  const tenantId = await requireTenantId();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  try {
    const result = await listProducts(tenantId, { page, limit });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar los productos.");
  }
}

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
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
    const product = await createProduct(requestBody as CreateProductInput, tenantId);
    return successResponse(product, 201);
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return errorResponse("Invalid product input.", 400, error.reasons);
    }
    return errorResponse("Could not save product.");
  }
}
