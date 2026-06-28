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
const testCashierName = "SOLVEN_DASHBOARD_CASHIER";
const testTenantEmail = "solven_dashboard@test.internal";

let testTenantId: string;

describe("dashboard summary", () => {
  beforeEach(async () => {
    await deleteDashboardSummaryData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Dashboard Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    await prisma.cashRegisterSession.create({
      data: { tenantId: testTenantId, cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteDashboardSummaryData();
    await prisma.$disconnect();
  });

  it("calculates core business metrics from existing database data", async () => {
    const baseline = await getDashboardSummary(testTenantId);
    const cashSaleProduct = await createProduct({
      name: `${testProductNamePrefix}CASH_${Date.now()}`,
      costPrice: 5, salePrice: 20, stock: 10
    }, testTenantId);
    const creditSaleProduct = await createProduct({
      name: `${testProductNamePrefix}CREDIT_${Date.now()}`,
      costPrice: 6, salePrice: 30, stock: 9
    }, testTenantId);
    await createProduct({
      name: `${testProductNamePrefix}LOW_${Date.now()}`,
      costPrice: 1, salePrice: 2, stock: LOW_STOCK_THRESHOLD
    }, testTenantId);
    await createProduct({
      name: `${testProductNamePrefix}ZERO_${Date.now()}`,
      costPrice: 1, salePrice: 2, stock: 0
    }, testTenantId);

    await createSale({
      paymentType: "CASH",
      items: [{ productId: cashSaleProduct.id, quantity: 2 }]
    }, testTenantId);

    const customer = await prisma.customer.create({
      data: { tenantId: testTenantId, name: `${testCustomerNamePrefix}${Date.now()}` }
    });

    await createSale({
      items: [{ productId: creditSaleProduct.id, quantity: 1 }]
    }, testTenantId);
    await createDebt({ customerId: customer.id, totalAmount: 40 }, testTenantId);
    await createExpense({
      amount: 12,
      category: "Operations",
      description: `${testExpenseDescriptionPrefix}${Date.now()}`
    }, testTenantId);
    await createCashMovement({
      type: "OUT",
      amount: 3,
      source: "TEST_ADJUSTMENT",
      referenceId: `${cashReferencePrefix}${Date.now()}`
    }, testTenantId);

    const summary = await getDashboardSummary(testTenantId);

    expect(summary.totalSalesAmount.minus(baseline.totalSalesAmount).toString()).toBe("70");
    expect(summary.totalExpensesAmount.minus(baseline.totalExpensesAmount).toString()).toBe("12");
    expect(summary.totalCashIn.minus(baseline.totalCashIn).toString()).toBe("70");
    expect(summary.totalCashOut.minus(baseline.totalCashOut).toString()).toBe("15");
    expect(summary.currentCashBalance.minus(baseline.currentCashBalance).toString()).toBe("55");
    expect(summary.totalDebtRemaining.minus(baseline.totalDebtRemaining).toString()).toBe("40");
    expect(summary.totalProducts - baseline.totalProducts).toBe(4);
    expect(summary.lowStockProductsCount - baseline.lowStockProductsCount).toBe(2);
  });
});

async function deleteDashboardSummaryData() {
  const testProducts = await prisma.product.findMany({
    where: { name: { startsWith: testProductNamePrefix } },
    select: { id: true }
  });
  const testProductIds = testProducts.map((p) => p.id);
  const testSaleItems = await prisma.saleItem.findMany({
    where: { productId: { in: testProductIds } },
    select: { saleId: true }
  });
  const testSaleIds = [...new Set(testSaleItems.map((si) => si.saleId))];
  const testCustomers = await prisma.customer.findMany({
    where: { name: { startsWith: testCustomerNamePrefix } },
    select: { id: true }
  });
  const testCustomerIds = testCustomers.map((c) => c.id);
  const testDebts = await prisma.debt.findMany({
    where: { customerId: { in: testCustomerIds } },
    select: { id: true }
  });
  const testDebtIds = testDebts.map((d) => d.id);
  const testExpenses = await prisma.expense.findMany({
    where: { description: { startsWith: testExpenseDescriptionPrefix } },
    select: { id: true }
  });
  const testExpenseIds = testExpenses.map((e) => e.id);

  await prisma.cashMovement.deleteMany({
    where: {
      OR: [
        { source: "SALE", referenceId: { in: testSaleIds } },
        { source: "EXPENSE", referenceId: { in: testExpenseIds } },
        { referenceId: { startsWith: cashReferencePrefix } }
      ]
    }
  });
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.debtPayment.deleteMany({ where: { debtId: { in: testDebtIds } } });
  await prisma.debt.deleteMany({ where: { id: { in: testDebtIds } } });
  await prisma.saleItem.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
  await prisma.expense.deleteMany({ where: { id: { in: testExpenseIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } });
  await prisma.cashRegisterSession.deleteMany({ where: { cashierName: testCashierName } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
