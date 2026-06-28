import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createCustomer } from "./customers";
import { registerDebtPayment } from "./debts";
import { createExpense } from "./expenses";
import { createProduct } from "./products";
import { createSale } from "./sales";

const testProductNamePrefix = "SOLVEN_CORE_FLOW_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_CORE_FLOW_CUSTOMER_";
const testExpenseDescriptionPrefix = "SOLVEN_CORE_FLOW_EXPENSE_";
const testCashierName = "SOLVEN_CORE_FLOW_CASHIER";
const testTenantEmail = "solven_core_flow@test.internal";

let testTenantId: string;

describe("SOLVEN core business flow", () => {
  beforeEach(async () => {
    await deleteCoreFlowData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Core Flow Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    await prisma.cashRegisterSession.create({
      data: { tenantId: testTenantId, cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteCoreFlowData();
    await prisma.$disconnect();
  });

  it("records cash sales, expenses, credit sales, and debt payments with traceable effects", async () => {
    const cashProduct = await createProduct({
      name: `${testProductNamePrefix}CASH_${Date.now()}`,
      costPrice: 8,
      salePrice: 15,
      stock: 10
    }, testTenantId);

    const cashSale = await createSale({
      paymentType: "CASH",
      items: [{ productId: cashProduct.id, quantity: 2 }]
    }, testTenantId);

    const updatedCashProduct = await prisma.product.findUniqueOrThrow({ where: { id: cashProduct.id } });
    const cashSaleInventoryMovement = await prisma.inventoryMovement.findFirstOrThrow({
      where: { productId: cashProduct.id, reason: `SALE:${cashSale.id}` }
    });
    const cashSaleCashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "SALE", referenceId: cashSale.id }
    });

    expect(updatedCashProduct.stock).toBe(8);
    expect(cashSaleInventoryMovement).toMatchObject({ previousStock: 10, newStock: 8, quantityChange: -2 });
    expect(cashSaleCashMovement).toMatchObject({ type: "IN", source: "SALE", referenceId: cashSale.id });
    expect(cashSaleCashMovement.amount.toString()).toBe("30");

    const expense = await createExpense({
      amount: 12.5,
      category: "Operations",
      description: `${testExpenseDescriptionPrefix}${Date.now()}`
    }, testTenantId);
    const expenseCashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "EXPENSE", referenceId: expense.id }
    });

    expect(expenseCashMovement).toMatchObject({ type: "OUT", source: "EXPENSE", referenceId: expense.id });
    expect(expenseCashMovement.amount.toString()).toBe("12.5");

    // CREDIT sales are no longer allowed (Fiado removed). Only CASH is accepted.
    await expect(
      createSale({
        // @ts-expect-error testing runtime rejection of non-CASH
        paymentType: "CREDIT",
        items: [{ productId: cashProduct.id, quantity: 1 }]
      }, testTenantId)
    ).rejects.toThrow();
  });
});

async function deleteCoreFlowData() {
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
  const testExpenses = await prisma.expense.findMany({
    where: { description: { startsWith: testExpenseDescriptionPrefix } },
    select: { id: true }
  });
  const testExpenseIds = testExpenses.map((e) => e.id);
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
  const testDebtPayments = await prisma.debtPayment.findMany({
    where: { debtId: { in: testDebtIds } },
    select: { id: true }
  });
  const testDebtPaymentIds = testDebtPayments.map((p) => p.id);

  await prisma.cashMovement.deleteMany({
    where: {
      OR: [
        { source: "SALE", referenceId: { in: testSaleIds } },
        { source: "EXPENSE", referenceId: { in: testExpenseIds } },
        { source: "DEBT_PAYMENT", referenceId: { in: testDebtPaymentIds } }
      ]
    }
  });
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.debtPayment.deleteMany({ where: { id: { in: testDebtPaymentIds } } });
  await prisma.debt.deleteMany({ where: { id: { in: testDebtIds } } });
  await prisma.saleItem.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
  await prisma.expense.deleteMany({ where: { id: { in: testExpenseIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } });
  await prisma.cashRegisterSession.deleteMany({ where: { cashierName: testCashierName } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
