import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createCashMovement } from "../cash";
import { createDebt } from "../debts";
import { createExpense } from "../expenses";
import { createProduct } from "../products";
import { createSale } from "../sales";
import { getDashboardSummary, LOW_STOCK_THRESHOLD } from "./dashboard-summary";

const testProductNamePrefix = "SOLVEN_DASHBOARD_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_DASHBOARD_CUSTOMER_";
const testExpenseDescriptionPrefix = "SOLVEN_DASHBOARD_EXPENSE_";
const cashReferencePrefix = "SOLVEN_DASHBOARD_CASH_";

describe("dashboard summary", () => {
  beforeEach(async () => {
    await deleteDashboardSummaryData();
  });

  afterAll(async () => {
    await deleteDashboardSummaryData();
    await prisma.$disconnect();
  });

  it("calculates core business metrics from existing database data", async () => {
    const baseline = await getDashboardSummary();
    const cashSaleProduct = await createProduct({
      name: `${testProductNamePrefix}CASH_${Date.now()}`,
      costPrice: 5,
      salePrice: 20,
      stock: 10
    });
    const creditSaleProduct = await createProduct({
      name: `${testProductNamePrefix}CREDIT_${Date.now()}`,
      costPrice: 6,
      salePrice: 30,
      stock: 9
    });
    await createProduct({
      name: `${testProductNamePrefix}LOW_${Date.now()}`,
      costPrice: 1,
      salePrice: 2,
      stock: LOW_STOCK_THRESHOLD
    });
    await createProduct({
      name: `${testProductNamePrefix}ZERO_${Date.now()}`,
      costPrice: 1,
      salePrice: 2,
      stock: 0
    });

    await createSale({
      paymentType: "CASH",
      items: [
        {
          productId: cashSaleProduct.id,
          quantity: 2
        }
      ]
    });

    const customer = await prisma.customer.create({
      data: {
        name: `${testCustomerNamePrefix}${Date.now()}`
      }
    });

    await createSale({
      paymentType: "CREDIT",
      customerId: customer.id,
      items: [
        {
          productId: creditSaleProduct.id,
          quantity: 1
        }
      ]
    });
    await createDebt({
      customerId: customer.id,
      totalAmount: 40
    });
    await createExpense({
      amount: 12,
      category: "Operations",
      description: `${testExpenseDescriptionPrefix}${Date.now()}`
    });
    await createCashMovement({
      type: "OUT",
      amount: 3,
      source: "TEST_ADJUSTMENT",
      referenceId: `${cashReferencePrefix}${Date.now()}`
    });

    const summary = await getDashboardSummary();

    expect(summary.totalSalesAmount.minus(baseline.totalSalesAmount).toString()).toBe(
      "70"
    );
    expect(
      summary.totalExpensesAmount.minus(baseline.totalExpensesAmount).toString()
    ).toBe("12");
    expect(summary.totalCashIn.minus(baseline.totalCashIn).toString()).toBe(
      "40"
    );
    expect(summary.totalCashOut.minus(baseline.totalCashOut).toString()).toBe(
      "15"
    );
    expect(
      summary.currentCashBalance.minus(baseline.currentCashBalance).toString()
    ).toBe("25");
    expect(
      summary.totalDebtRemaining.minus(baseline.totalDebtRemaining).toString()
    ).toBe("70");
    expect(summary.totalProducts - baseline.totalProducts).toBe(4);
    expect(
      summary.lowStockProductsCount - baseline.lowStockProductsCount
    ).toBe(2);
  });
});

async function deleteDashboardSummaryData() {
  const testProducts = await prisma.product.findMany({
    where: {
      name: {
        startsWith: testProductNamePrefix
      }
    },
    select: {
      id: true
    }
  });
  const testProductIds = testProducts.map((product) => product.id);
  const testSaleItems = await prisma.saleItem.findMany({
    where: {
      productId: {
        in: testProductIds
      }
    },
    select: {
      saleId: true
    }
  });
  const testSaleIds = [
    ...new Set(testSaleItems.map((saleItem) => saleItem.saleId))
  ];
  const testCustomers = await prisma.customer.findMany({
    where: {
      name: {
        startsWith: testCustomerNamePrefix
      }
    },
    select: {
      id: true
    }
  });
  const testCustomerIds = testCustomers.map((customer) => customer.id);
  const testDebts = await prisma.debt.findMany({
    where: {
      customerId: {
        in: testCustomerIds
      }
    },
    select: {
      id: true
    }
  });
  const testDebtIds = testDebts.map((debt) => debt.id);
  const testExpenses = await prisma.expense.findMany({
    where: {
      description: {
        startsWith: testExpenseDescriptionPrefix
      }
    },
    select: {
      id: true
    }
  });
  const testExpenseIds = testExpenses.map((expense) => expense.id);

  await prisma.cashMovement.deleteMany({
    where: {
      OR: [
        {
          source: "SALE",
          referenceId: {
            in: testSaleIds
          }
        },
        {
          source: "EXPENSE",
          referenceId: {
            in: testExpenseIds
          }
        },
        {
          referenceId: {
            startsWith: cashReferencePrefix
          }
        }
      ]
    }
  });
  await prisma.inventoryMovement.deleteMany({
    where: {
      productId: {
        in: testProductIds
      }
    }
  });
  await prisma.debtPayment.deleteMany({
    where: {
      debtId: {
        in: testDebtIds
      }
    }
  });
  await prisma.debt.deleteMany({
    where: {
      id: {
        in: testDebtIds
      }
    }
  });
  await prisma.saleItem.deleteMany({
    where: {
      productId: {
        in: testProductIds
      }
    }
  });
  await prisma.sale.deleteMany({
    where: {
      id: {
        in: testSaleIds
      }
    }
  });
  await prisma.expense.deleteMany({
    where: {
      id: {
        in: testExpenseIds
      }
    }
  });
  await prisma.product.deleteMany({
    where: {
      id: {
        in: testProductIds
      }
    }
  });
  await prisma.customer.deleteMany({
    where: {
      id: {
        in: testCustomerIds
      }
    }
  });
}
