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

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    salesSummary,
    expensesSummary,
    cashInSummary,
    cashOutSummary,
    debtsSummary,
    totalProducts,
    lowStockProductsCount
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: {
        totalAmount: true
      }
    }),
    prisma.expense.aggregate({
      _sum: {
        amount: true
      }
    }),
    prisma.cashMovement.aggregate({
      _sum: {
        amount: true
      },
      where: {
        type: "IN"
      }
    }),
    prisma.cashMovement.aggregate({
      _sum: {
        amount: true
      },
      where: {
        type: "OUT"
      }
    }),
    prisma.debt.aggregate({
      _sum: {
        remainingAmount: true
      }
    }),
    prisma.product.count(),
    prisma.product.count({
      where: {
        stock: {
          lte: LOW_STOCK_THRESHOLD
        }
      }
    })
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
