import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  createSale,
  listSales,
  SaleInsufficientStockError,
  SaleProductNotFoundError
} from "./sale-data-access";

const testProductNamePrefix = "SOLVEN_SALE_TEST_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_SALE_TEST_CUSTOMER_";
const testCashierName = "SOLVEN_SALE_TEST_CASHIER";
const testTenantEmail = "solven_sale_test@test.internal";

let testTenantId: string;

describe("sale data access", () => {
  beforeEach(async () => {
    await deleteSaleTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Sale Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    await prisma.cashRegisterSession.create({
      data: { tenantId: testTenantId, cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteSaleTestData();
    await prisma.$disconnect();
  });

  it("creates a sale, sale items, product stock updates, and inventory movements atomically", async () => {
    const firstProduct = await createTestProduct("RICE", 10, 5);
    const secondProduct = await createTestProduct("BEANS", 4.5, 8);

    const sale = await createSale({
      items: [
        { productId: firstProduct.id, quantity: 2 },
        { productId: secondProduct.id, quantity: 3 }
      ]
    }, testTenantId);

    const updatedFirstProduct = await prisma.product.findUniqueOrThrow({ where: { id: firstProduct.id } });
    const updatedSecondProduct = await prisma.product.findUniqueOrThrow({ where: { id: secondProduct.id } });
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: { reason: `SALE:${sale.id}` },
      orderBy: { productId: "asc" }
    });
    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "SALE", referenceId: sale.id }
    });

    expect(sale.totalAmount.toString()).toBe("33.5");
    expect(sale).toMatchObject({ paymentType: "CASH", customerId: null, debtId: null });
    expect(sale.items).toHaveLength(2);
    expect(updatedFirstProduct.stock).toBe(3);
    expect(updatedSecondProduct.stock).toBe(5);
    expect(inventoryMovements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: firstProduct.id, previousStock: 5, newStock: 3, quantityChange: -2 }),
        expect.objectContaining({ productId: secondProduct.id, previousStock: 8, newStock: 5, quantityChange: -3 })
      ])
    );
    expect(cashMovement.amount.toString()).toBe("33.5");
    expect(cashMovement).toMatchObject({ type: "IN", source: "SALE", referenceId: sale.id });
  });

  it("rejects CREDIT paymentType (only CASH accepted)", async () => {
    const product = await createTestProduct("CREDIT_REJECT", 11, 7);
    await expect(
      createSale({
        // @ts-expect-error testing runtime rejection of non-CASH
        paymentType: "CREDIT",
        items: [{ productId: product.id, quantity: 3 }]
      }, testTenantId)
    ).rejects.toThrow();
  });

  it("rejects a sale when a product does not exist", async () => {
    await expect(
      createSale({ items: [{ productId: "missing-product", quantity: 1 }] }, testTenantId)
    ).rejects.toThrow(SaleProductNotFoundError);
  });

  it("rejects a sale when stock is insufficient and does not create records", async () => {
    const product = await createTestProduct("LOW_STOCK", 8, 1);

    await expect(
      createSale({ items: [{ productId: product.id, quantity: 2 }] }, testTenantId)
    ).rejects.toThrow(SaleInsufficientStockError);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    const saleItems = await prisma.saleItem.findMany({ where: { productId: product.id } });
    const inventoryMovements = await prisma.inventoryMovement.findMany({ where: { productId: product.id } });

    expect(updatedProduct.stock).toBe(1);
    expect(saleItems).toHaveLength(0);
    expect(inventoryMovements).toHaveLength(0);
  });

  it("prevents concurrent sales from overselling product stock", async () => {
    const product = await createTestProduct("CONCURRENT", 8, 1);

    const results = await Promise.allSettled([
      createSale({ items: [{ productId: product.id, quantity: 1 }] }, testTenantId),
      createSale({ items: [{ productId: product.id, quantity: 1 }] }, testTenantId)
    ]);

    const fulfilledResults = results.filter((r) => r.status === "fulfilled");
    const rejectedResults = results.filter((r) => r.status === "rejected");
    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    const saleItems = await prisma.saleItem.findMany({ where: { productId: product.id } });
    const inventoryMovements = await prisma.inventoryMovement.findMany({ where: { productId: product.id } });
    const cashMovements = await prisma.cashMovement.findMany({
      where: { source: "SALE", referenceId: { in: saleItems.map((si) => si.saleId) } }
    });

    expect(fulfilledResults).toHaveLength(1);
    expect(rejectedResults).toHaveLength(1);
    expect(rejectedResults[0].reason).toBeInstanceOf(SaleInsufficientStockError);
    expect(updatedProduct.stock).toBe(0);
    expect(saleItems).toHaveLength(1);
    expect(inventoryMovements).toHaveLength(1);
    expect(inventoryMovements[0]).toMatchObject({ previousStock: 1, newStock: 0, quantityChange: -1 });
    expect(cashMovements).toHaveLength(1);
  });

  it("lists sales after creation", async () => {
    const product = await createTestProduct("LIST", 6, 3);
    const sale = await createSale({
      items: [{ productId: product.id, quantity: 1 }]
    }, testTenantId);

    const result = await listSales(testTenantId);

    expect(result.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: sale.id })])
    );
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

async function createTestCustomer() {
  return prisma.customer.create({
    data: { tenantId: testTenantId, name: `${testCustomerNamePrefix}${Date.now()}` }
  });
}

async function deleteSaleTestData() {
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

  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.cashMovement.deleteMany({ where: { source: "SALE", referenceId: { in: testSaleIds } } });
  await prisma.debtPayment.deleteMany({ where: { debtId: { in: testDebtIds } } });
  await prisma.debt.deleteMany({ where: { id: { in: testDebtIds } } });
  await prisma.saleItem.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } });
  await prisma.cashRegisterSession.deleteMany({ where: { cashierName: testCashierName } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
