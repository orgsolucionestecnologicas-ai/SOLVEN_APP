export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { forbiddenResponse, unauthorizedResponse } from "../_shared/responses";

const SALES_LIMIT = 500;

export async function GET() {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const [tenant, settings, products, services, customers, sales, expenses, debts] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.storeSettings.findUnique({ where: { tenantId } }),
    prisma.product.findMany({ where: { tenantId } }),
    prisma.service.findMany({ where: { tenantId } }),
    prisma.customer.findMany({ where: { tenantId } }),
    prisma.sale.findMany({
      where: { tenantId },
      orderBy: { saleDate: "desc" },
      take: SALES_LIMIT,
      include: { items: true }
    }),
    prisma.expense.findMany({ where: { tenantId } }),
    prisma.debt.findMany({ where: { tenantId, remainingAmount: { gt: 0 } } })
  ]);

  const exportedAt = new Date();
  const data = {
    exportedAt: exportedAt.toISOString(),
    tenant: { businessName: tenant?.businessName ?? "", email: tenant?.email ?? "", settings },
    products,
    services,
    customers,
    sales,
    expenses,
    debts
  };

  const filename = `solven-backup-${exportedAt.toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
