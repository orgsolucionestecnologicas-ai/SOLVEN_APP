import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { confirmQuote, createQuote } from "./quote-data-access";
import { QuoteAlreadyConfirmedError } from "./quote-validation";

const testProductNamePrefix = "SOLVEN_QUOTE_TEST_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_QUOTE_TEST_CUSTOMER_";
const testTenantEmail = "solven_quote_test@test.internal";

let testTenantId: string;

describe("confirmQuote", () => {
  beforeEach(async () => {
    await deleteQuoteTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Quote Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
  });

  afterAll(async () => {
    await deleteQuoteTestData();
    await prisma.$disconnect();
  });

  it("confirms a draft quote once, decrementing stock and creating exactly one sale", async () => {
    const product = await createTestProduct("CONFIRM", 50, 5);
    const quote = await createQuote(
      { customerName: testCustomerNamePrefix, items: [{ productId: product.id, quantity: 2 }] },
      testTenantId
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
      testTenantId
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
      testTenantId
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

  await prisma.quote.deleteMany({ where: { customerName: { startsWith: testCustomerNamePrefix } } });
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.cashMovement.deleteMany({ where: { source: "SALE", referenceId: { in: testSaleIds } } });
  await prisma.saleItem.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
