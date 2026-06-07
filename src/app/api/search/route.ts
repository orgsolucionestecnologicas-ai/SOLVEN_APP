export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant";
import { successResponse } from "../_shared/responses";

const RESULT_LIMIT = 5;

export async function GET(request: Request) {
  const tenantId = await requireTenantId();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return successResponse({ productos: [], clientes: [], servicios: [] });
  }

  const [productos, clientes, servicios] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { productCode: { contains: q, mode: "insensitive" } }
        ]
      },
      select: { id: true, name: true, productCode: true, salePrice: true, stock: true },
      take: RESULT_LIMIT
    }),
    prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } }
        ]
      },
      select: { id: true, name: true, phone: true },
      take: RESULT_LIMIT
    }),
    prisma.service.findMany({
      where: { tenantId, isActive: true, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, price: true },
      take: RESULT_LIMIT
    })
  ]);

  return successResponse({
    productos: productos.map((p) => ({ ...p, salePrice: p.salePrice.toString() })),
    clientes,
    servicios: servicios.map((s) => ({ id: s.id, name: s.name, price: s.price.toString() }))
  });
}
