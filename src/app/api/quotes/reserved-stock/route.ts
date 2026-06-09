export const dynamic = "force-dynamic";
import { getReservedStockByProduct } from "../../../../modules/quotes";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    const reservedMap = await getReservedStockByProduct(tenantId);
    const productIds = [...reservedMap.keys()];

    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, tenantId },
          select: { id: true, name: true },
        })
      : [];

    const nameById = new Map(products.map((p) => [p.id, p.name]));

    const result = productIds.map((productId) => ({
      productId,
      productName: nameById.get(productId) ?? productId,
      reservedQuantity: reservedMap.get(productId) ?? 0,
    }));

    return successResponse(result);
  } catch {
    return errorResponse("No se pudo obtener el stock reservado.");
  }
}
