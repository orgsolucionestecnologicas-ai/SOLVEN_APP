export const dynamic = 'force-dynamic';
import {
  getProductById,
  updateProduct,
  ProductValidationError,
  type UpdateProductInput
} from "../../../../modules/products";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../_shared/responses";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, getSession, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    ([{ id }, tenantId] = await Promise.all([params, requireTenantId()]));
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
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
  let id: string, tenantId: string, userId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER", "INVENTORY"])]));
    tenantId = role.tenantId;
    userId = role.userId;
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
    return errorResponse("Product update input must be an object.", 400);
  }

  try {
    const product = await updateProduct(id, body as UpdateProductInput, tenantId);
    void logAudit({
      tenantId,
      userId,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: product.id,
      metadata: { name: product.name }
    });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    ([{ id }, tenantId] = await Promise.all([params, requireTenantId()]));
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) return errorResponse("Producto no encontrado.", 404);

    await prisma.product.delete({ where: { id } });
    const session = await getSession();
    if (session) {
      void logAudit({
        tenantId,
        userId: session.userId,
        action: "PRODUCT_DELETED",
        entityType: "Product",
        entityId: product.id,
        metadata: { name: product.name }
      });
    }
    return successResponse({ deleted: true });
  } catch {
    return errorResponse("No se pudo eliminar el producto.");
  }
}
