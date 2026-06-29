export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { errorResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";

const TOP_PRODUCTS_LIMIT = 12;

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    // Product no tiene campo isActive/active en el schema actual, por eso
    // el filtro de "inactivos" del prompt se resuelve solo con stock > 0.
    const topSales = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        sale: { tenantId },
        product: { stock: { gt: 0 } }
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: TOP_PRODUCTS_LIMIT
    });

    const productIds = topSales
      .map((row) => row.productId)
      .filter((id): id is string => id !== null);

    if (productIds.length === 0) {
      return successResponse([]);
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        productCode: true,
        categoryName: true,
        salePrice: true,
        stock: true,
        ivaRate: true
      }
    });

    const rankById = new Map(productIds.map((id, index) => [id, index]));
    const sorted = products
      .slice()
      .sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));

    return successResponse(sorted);
  } catch {
    return errorResponse("No se pudieron cargar los productos más vendidos.");
  }
}
