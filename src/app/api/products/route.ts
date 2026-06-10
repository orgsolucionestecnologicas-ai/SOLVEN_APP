export const dynamic = 'force-dynamic';
import { createProduct, listProducts } from "../../../modules/products";
import {
  type CreateProductInput,
  ProductValidationError
} from "../../../modules/products/product-validation";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  paginatedResponse,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
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
  let tenantId: string;
  let userId: string;
  try {
    ({ tenantId, userId } = await requireRole(["OWNER", "INVENTORY"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
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
    void logAudit({
      tenantId,
      userId,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      metadata: { name: product.name }
    });
    return successResponse(product, 201);
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return errorResponse("Invalid product input.", 400, error.reasons);
    }
    return errorResponse("Could not save product.");
  }
}
