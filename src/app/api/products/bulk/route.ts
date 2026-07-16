export const dynamic = 'force-dynamic';
import {
  ProductValidationError,
  validateUpdateProductInput,
  type UpdateProductInput
} from "../../../../modules/products";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../_shared/responses";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

type PriceAdjustment = { mode: "percent" | "fixed"; value: number };

type BulkUpdateBody = {
  ids?: unknown;
  categoryName?: unknown;
  ivaRate?: unknown;
  priceAdjustment?: unknown;
};

export async function PATCH(request: Request) {
  let tenantId: string;
  let userId: string;
  try {
    ({ tenantId, userId } = await requireRole(["OWNER", "INVENTORY"], "products"));
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
    return errorResponse("Bulk update input must be an object.", 400);
  }

  const input = body as BulkUpdateBody;
  const ids = Array.isArray(input.ids)
    ? input.ids.filter((id): id is string => typeof id === "string")
    : [];

  if (ids.length === 0) {
    return errorResponse("Debés seleccionar al menos un producto.", 400);
  }

  const categoryName = typeof input.categoryName === "string" ? input.categoryName : undefined;
  const ivaRate = typeof input.ivaRate === "number" ? input.ivaRate : undefined;

  let priceAdjustment: PriceAdjustment | undefined;
  if (input.priceAdjustment !== undefined && input.priceAdjustment !== null) {
    const raw = input.priceAdjustment as Partial<PriceAdjustment>;
    if (
      (raw.mode !== "percent" && raw.mode !== "fixed") ||
      typeof raw.value !== "number" ||
      !Number.isFinite(raw.value)
    ) {
      return errorResponse("priceAdjustment inválido.", 400);
    }
    priceAdjustment = { mode: raw.mode, value: raw.value };
  }

  if (categoryName === undefined && ivaRate === undefined && !priceAdjustment) {
    return errorResponse("Debés indicar al menos un cambio a aplicar.", 400);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: ids }, tenantId }
      });

      const results = [];
      for (const product of products) {
        const patch: UpdateProductInput = {};
        if (categoryName !== undefined) patch.categoryName = categoryName;
        if (ivaRate !== undefined) patch.ivaRate = ivaRate;
        if (priceAdjustment) {
          const current = Number(product.salePrice);
          const next =
            priceAdjustment.mode === "percent"
              ? current * (1 + priceAdjustment.value / 100)
              : current + priceAdjustment.value;
          patch.salePrice = Math.round(next * 100) / 100;
        }

        const data = validateUpdateProductInput(patch);
        results.push(await tx.product.update({ where: { id: product.id, tenantId }, data }));
      }

      return results;
    });

    for (const product of updated) {
      void logAudit({
        tenantId,
        userId,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: product.id,
        metadata: { name: product.name, bulk: true }
      });
    }

    return successResponse({ updated: updated.length, products: updated });
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return errorResponse("Invalid product input.", 400, error.reasons);
    }
    return errorResponse("No se pudo aplicar el cambio masivo.");
  }
}
