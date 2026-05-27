import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createCashMovement } from "../../../../modules/cash";
import { createDebt } from "../../../../modules/debts";
import { createExpense } from "../../../../modules/expenses";
import { createProduct } from "../../../../modules/products";
import { createSale } from "../../../../modules/sales";
import { GET } from "./route";

const testProductNamePrefix = "SOLVEN_DASHBOARD_API_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_DASHBOARD_API_CUSTOMER_";
const testExpenseDescriptionPrefix = "SOLVEN_DASHBOARD_API_EXPENSE_";
const cashReferencePrefix = "SOLVEN_DASHBOARD_API_CASH_";
const testCashierName = "SOLVEN_DASHBOARD_API_CASHIER";

describe("dashboard summary API database integration", () => {
  beforeEach(async () => {
    await deleteDashboardSummaryApiData();
    await prisma.cashRegisterSession.create({
      data: { cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteDashboardSummaryApiData();
    await prisma.$disconnect();
  });

  it("returns dashboard summary metrics from the database", async () => {
    const baseline = await readSummary();
    const saleProduct = await createProduct({
      name: `${testProductNamePrefix}SALE_${Date.now()}`,
      costPrice: 5,
      salePrice: 18,
      stock: 8
    });
    await createProduct({
      name: `${testProductNamePrefix}LOW_${Date.now()}`,
      costPrice: 1,
      salePrice: 2,
      stock: 5
    });
    const customer = await prisma.customer.create({
      data: {
        name: `${testCustomerNamePrefix}${Date.now()}`
      }
    });

    await createSale({
      paymentType: "CASH",
      items: [
        {
          productId: saleProduct.id,
          quantity: 2
        }
      ]
    });
    await createDebt({
      customerId: customer.id,
      totalAmount: 25
    });
    await createExpense({
      amount: 9,
      category: "Operations",
      description: `${testExpenseDescriptionPrefix}${Date.now()}`
    });
    await createCashMovement({
      type: "OUT",
      amount: 4,
      source: "TEST_ADJUSTMENT",
      referenceId: `${cashReferencePrefix}${Date.now()}`
    });

    const summary = await readSummary();

    expect(Number(summary.totalSalesAmount) - Number(baseline.totalSalesAmount)).toBe(
      36
    );
    expect(
      Number(summary.totalExpensesAmount) -
        Number(baseline.totalExpensesAmount)
    ).toBe(9);
    expect(Number(summary.totalCashIn) - Number(baseline.totalCashIn)).toBe(36);
    expect(Number(summary.totalCashOut) - Number(baseline.totalCashOut)).toBe(
      13
    );
    expect(
      Number(summary.currentCashBalance) - Number(baseline.currentCashBalance)
    ).toBe(23);
    expect(
      Number(summary.totalDebtRemaining) - Number(baseline.totalDebtRemaining)
    ).toBe(25);
    expect(summary.totalProducts - baseline.totalProducts).toBe(2);
    expect(
      summary.lowStockProductsCount - baseline.lowStockProductsCount
    ).toBe(1);
  });
});

type DashboardSummaryResponse = {
  totalSalesAmount: string;
  totalExpensesAmount: string;
  totalCashIn: string;
  totalCashOut: string;
  currentCashBalance: string;
  totalDebtRemaining: string;
  totalProducts: number;
  lowStockProductsCount: number;
};

async function readSummary() {
  const response = await GET();
  const responseBody = (await response.json()) as {
    data: DashboardSummaryResponse;
  };

  expect(response.status).toBe(200);

  return responseBody.data;
}

async function deleteDashboardSummaryApiData() {
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
  await prisma.cashRegisterSession.deleteMany({
    where: { cashierName: testCashierName }
  });
}
