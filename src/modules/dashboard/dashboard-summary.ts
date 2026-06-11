import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const LOW_STOCK_THRESHOLD = 5;

export type DashboardSummary = {
  totalSalesAmount: Prisma.Decimal;
  totalExpensesAmount: Prisma.Decimal;
  totalCashIn: Prisma.Decimal;
  totalCashOut: Prisma.Decimal;
  currentCashBalance: Prisma.Decimal;
  totalDebtRemaining: Prisma.Decimal;
  totalProducts: number;
  lowStockProductsCount: number;
};

export async function getDashboardSummary(
  tenantId: string
): Promise<DashboardSummary> {
  const lowStockRaw = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "Product"
    WHERE "tenantId" = ${tenantId}
    AND (
      ("minStock" > 0 AND "stock" <= "minStock")
      OR ("minStock" = 0 AND "stock" <= ${LOW_STOCK_THRESHOLD})
    )
  `;
  const lowStockProductsCount = Number(lowStockRaw[0].count);

  const [
    salesSummary,
    expensesSummary,
    cashInSummary,
    cashOutSummary,
    debtsSummary,
    totalProducts
  ] = await Promise.all([
    prisma.sale.aggregate({ where: { tenantId }, _sum: { totalAmount: true } }),
    prisma.expense.aggregate({ where: { tenantId }, _sum: { amount: true } }),
    prisma.cashMovement.aggregate({
      where: { tenantId, type: "IN" },
      _sum: { amount: true }
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId, type: "OUT" },
      _sum: { amount: true }
    }),
    prisma.debt.aggregate({
      where: { tenantId },
      _sum: { remainingAmount: true }
    }),
    prisma.product.count({ where: { tenantId } })
  ]);

  const totalSalesAmount = salesSummary._sum.totalAmount ?? zero();
  const totalExpensesAmount = expensesSummary._sum.amount ?? zero();
  const totalCashIn = cashInSummary._sum.amount ?? zero();
  const totalCashOut = cashOutSummary._sum.amount ?? zero();
  const totalDebtRemaining = debtsSummary._sum.remainingAmount ?? zero();

  return {
    totalSalesAmount,
    totalExpensesAmount,
    totalCashIn,
    totalCashOut,
    currentCashBalance: totalCashIn.minus(totalCashOut),
    totalDebtRemaining,
    totalProducts,
    lowStockProductsCount
  };
}

function zero() {
  return new Prisma.Decimal(0);
}
