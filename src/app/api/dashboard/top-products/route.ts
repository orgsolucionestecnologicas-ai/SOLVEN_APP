export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { errorResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  try {
    // Últimos 30 días
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const items = await prisma.saleItem.findMany({
      where: {
        sale: { tenantId, saleDate: { gte: since } },
        productId: { not: null },
      },
      select: {
        quantity: true,
        total: true,
        product: { select: { id: true, name: true } },
      },
    });

    // Agrupar por producto
    const map = new Map<string, { id: string; name: string; units: number; total: number }>();
    for (const item of items) {
      if (!item.product) continue;
      const key = item.product.id;
      const prev = map.get(key) ?? { id: item.product.id, name: item.product.name, units: 0, total: 0 };
      map.set(key, {
        ...prev,
        units: prev.units + item.quantity,
        total: prev.total + Number(item.total),
      });
    }

    const top5 = [...map.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return successResponse(top5);
  } catch {
    return errorResponse("No se pudieron cargar los productos más vendidos.");
  }
}
