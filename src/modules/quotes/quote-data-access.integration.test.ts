import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { CashRegisterNoSessionOpenError } from "@/modules/cash-register";

import { confirmQuote, createQuote } from "./quote-data-access";
import { QuoteAlreadyConfirmedError, QuoteValidationError } from "./quote-validation";

const testProductNamePrefix = "SOLVEN_QUOTE_TEST_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_QUOTE_TEST_CUSTOMER_";
const testTenantEmail = "solven_quote_test@test.internal";

let testTenantId: string;
let testUserId: string;

describe("confirmQuote", () => {
  beforeEach(async () => {
    await deleteQuoteTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Quote Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    const user = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: "Quote Test Seller",
        userCode: "QTS1",
        email: `solven_quote_test_user_${Date.now()}@test.internal`,
        password: "test-password",
        role: "OWNER"
      }
    });
    testUserId = user.id;
    await prisma.cashRegisterSession.create({
      data: { tenantId: testTenantId, cashierName: "Test Cashier", openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteQuoteTestData();
    await prisma.$disconnect();
  });

  it("confirms a draft quote once, decrementing stock and creating exactly one sale", async () => {
    const product = await createTestProduct("CONFIRM", 50, 5);
    const quote = await createQuote(
      { customerName: testCustomerNamePrefix, items: [{ productId: product.id, quantity: 2 }] },
      testTenantId,
      testUserId
    );

    const sale = await confirmQuote(quote.id, testTenantId);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    const persistedQuote = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } });

    expect(updatedProduct.stock).toBe(3);
    expect(persistedQuote.status).toBe("CONFIRMED");
    expect(persistedQuote.saleId).toBe(sale.id);
  });

  it("rejects a second sequential confirmation of the same quote", async () => {
    const product = await createTestProduct("SEQUENTIAL", 50, 5);
    const quote = await createQuote(
      { customerName: testCustomerNamePrefix, items: [{ productId: product.id, quantity: 1 }] },
      testTenantId,
      testUserId
    );

    await confirmQuote(quote.id, testTenantId);

    await expect(confirmQuote(quote.id, testTenantId)).rejects.toThrow(QuoteAlreadyConfirmedError);

    const sales = await prisma.sale.findMany({ where: { tenantId: testTenantId } });
    expect(sales).toHaveLength(1);
  });

  it("prevents concurrent confirmations of the same quote from both succeeding", async () => {
    const product = await createTestProduct("CONCURRENT", 50, 5);
    const quote = await createQuote(
      { customerName: testCustomerNamePrefix, items: [{ productId: product.id, quantity: 1 }] },
      testTenantId,
      testUserId
    );

    const results = await Promise.allSettled([
      confirmQuote(quote.id, testTenantId),
      confirmQuote(quote.id, testTenantId)
    ]);

    const fulfilledResults = results.filter((r) => r.status === "fulfilled");
    const rejectedResults = results.filter((r) => r.status === "rejected");
    const sales = await prisma.sale.findMany({ where: { tenantId: testTenantId } });
    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(fulfilledResults).toHaveLength(1);
    expect(rejectedResults).toHaveLength(1);
    expect(rejectedResults[0].reason).toBeInstanceOf(QuoteAlreadyConfirmedError);
    expect(sales).toHaveLength(1);
    expect(updatedProduct.stock).toBe(4);
  });

  it("caps the discountAmount to the computed total when creating a quote", async () => {
    const product = await createTestProduct("DISCOUNT_CAP", 50, 5);
    const quote = await createQuote(
      {
        customerName: testCustomerNamePrefix,
        items: [{ productId: product.id, quantity: 1 }],
        discountAmount: 999
      },
      testTenantId,
      testUserId
    );

    expect(quote.discountAmount.toString()).toBe("50");
  });

  it("propagates customerId and sellerId to the sale, and creates a cash movement for the net amount", async () => {
    const product = await createTestProduct("NET_TOTAL", 100, 5);
    const customer = await prisma.customer.create({
      data: { tenantId: testTenantId, name: `${testCustomerNamePrefix}NET_TOTAL_${Date.now()}` }
    });
    const quote = await createQuote(
      {
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 1 }],
        discountAmount: 20
      },
      testTenantId,
      testUserId
    );

    const sale = await confirmQuote(quote.id, testTenantId, "Efectivo");

    expect(sale.customerId).toBe(customer.id);
    expect(sale.sellerId).toBe(testUserId);
    expect(sale.sellerCode).toBe("QTS1");

    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "SALE", referenceId: sale.id }
    });
    expect(cashMovement.amount.toString()).toBe("80");
  });

  it("creates a Debt instead of a CashMovement when confirmed with the Credito method", async () => {
    const product = await createTestProduct("CREDIT_PATH", 100, 5);
    const customer = await prisma.customer.create({
      data: { tenantId: testTenantId, name: `${testCustomerNamePrefix}CREDIT_PATH_${Date.now()}` }
    });
    const quote = await createQuote(
      { customerId: customer.id, items: [{ productId: product.id, quantity: 1 }] },
      testTenantId,
      testUserId
    );

    const sale = await confirmQuote(quote.id, testTenantId, "Credito");

    expect(sale.paymentType).toBe("CREDIT");
    expect(sale.debtId).not.toBeNull();

    const debt = await prisma.debt.findUniqueOrThrow({ where: { id: sale.debtId as string } });
    expect(debt.remainingAmount.toString()).toBe("100");

    const cashMovements = await prisma.cashMovement.findMany({
      where: { source: "SALE", referenceId: sale.id }
    });
    expect(cashMovements).toHaveLength(0);
  });

  it("rejects a Credito confirmation when the quote has no associated customer", async () => {
    const product = await createTestProduct("CREDIT_NO_CUSTOMER", 100, 5);
    const quote = await createQuote(
      { customerName: testCustomerNamePrefix, items: [{ productId: product.id, quantity: 1 }] },
      testTenantId,
      testUserId
    );

    await expect(confirmQuote(quote.id, testTenantId, "Credito")).rejects.toThrow(QuoteValidationError);
  });

  it("rejects confirmation when there is no open cash register session", async () => {
    await prisma.cashRegisterSession.updateMany({
      where: { tenantId: testTenantId, status: "OPEN" },
      data: { status: "CLOSED" }
    });

    const product = await createTestProduct("NO_SESSION", 50, 5);
    const quote = await createQuote(
      { customerName: testCustomerNamePrefix, items: [{ productId: product.id, quantity: 1 }] },
      testTenantId,
      testUserId
    );

    await expect(confirmQuote(quote.id, testTenantId)).rejects.toThrow(CashRegisterNoSessionOpenError);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stock).toBe(5);
  });
});

async function createTestProduct(nameSuffix: string, salePrice: number, stock: number) {
  return prisma.product.create({
    data: {
      tenantId: testTenantId,
      name: `${testProductNamePrefix}${nameSuffix}_${Date.now()}`,
      costPrice: 1,
      salePrice,
      stock
    }
  });
}

async function deleteQuoteTestData() {
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

  await prisma.quote.deleteMany({ where: { customerName: { startsWith: testCustomerNamePrefix } } });
  await prisma.quote.deleteMany({ where: { customerId: { in: testCustomerIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.cashMovement.deleteMany({ where: { source: "SALE", referenceId: { in: testSaleIds } } });
  await prisma.saleItem.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
  await prisma.sale.deleteMany({ where: { customerId: { in: testCustomerIds } } });
  await prisma.debt.deleteMany({ where: { id: { in: testDebtIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  const testTenants = await prisma.tenant.findMany({ where: { email: testTenantEmail }, select: { id: true } });
  const testTenantIds = testTenants.map((t) => t.id);
  await prisma.cashRegisterSession.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
