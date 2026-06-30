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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        saleDate: { gte: todayStart, lt: tomorrowStart },
        returns: { none: {} },
      },
      select: { sellerId: true, sellerCode: true, totalAmount: true },
    });

    const sellerIds = [...new Set(sales.map((s) => s.sellerId).filter((id): id is string => !!id))];
    const users = sellerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: sellerIds }, tenantId },
          select: { id: true, name: true },
        })
      : [];
    const nameBySellerId = new Map(users.map((u) => [u.id, u.name]));

    const map = new Map<string, { id: string; name: string; totalAmount: number; salesCount: number }>();
    for (const sale of sales) {
      if (!sale.sellerId && !sale.sellerCode) continue;

      const key = sale.sellerId ?? sale.sellerCode!;
      const name = (sale.sellerId ? nameBySellerId.get(sale.sellerId) : null) ?? sale.sellerCode ?? key;
      const prev = map.get(key) ?? { id: key, name, totalAmount: 0, salesCount: 0 };
      map.set(key, {
        ...prev,
        totalAmount: prev.totalAmount + Number(sale.totalAmount),
        salesCount: prev.salesCount + 1,
      });
    }

    const topSellers = [...map.values()]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3);

    return successResponse(topSellers);
  } catch {
    return errorResponse("No se pudieron cargar los vendedores del día.");
  }
}
