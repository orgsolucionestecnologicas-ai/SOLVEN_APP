import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { adjustProductStock, StockAdjustmentConcurrentConflictError } from "./stock-adjustment";

const testProductNamePrefix = "SOLVEN_STOCK_ADJUSTMENT_PRODUCT_";
const testTenantEmail = "solven_stock_adjustment@test.internal";
const otherTestTenantEmail = "solven_stock_adjustment_other@test.internal";

let testTenantId: string;
let testUserId: string;
let otherTestTenantId: string;

describe("adjustProductStock", () => {
  beforeEach(async () => {
    await deleteStockAdjustmentTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Stock Adjustment Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;

    const otherTenant = await prisma.tenant.create({
      data: { businessName: "Stock Adjustment Other Test Tenant", email: otherTestTenantEmail }
    });
    otherTestTenantId = otherTenant.id;

    const user = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: "Integration Tester",
        email: `solven_stock_adjustment_user_${Date.now()}@test.internal`,
        password: "test-password",
        role: "OWNER"
      }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await deleteStockAdjustmentTestData();
    await prisma.$disconnect();
  });

  it("updates product stock and records an inventory movement atomically", async () => {
    const product = await prisma.product.create({
      data: {
        tenantId: testTenantId,
        name: `${testProductNamePrefix}${Date.now()}`,
        costPrice: 5,
        salePrice: 8,
        stock: 4
      }
    });

    const result = await adjustProductStock(
      { productId: product.id, newStock: 9, reason: "Manual stock count" },
      testTenantId,
      testUserId
    );

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    const inventoryMovements = await prisma.inventoryMovement.findMany({ where: { productId: product.id } });

    expect(result.product.stock).toBe(9);
    expect(updatedProduct.stock).toBe(9);
    expect(inventoryMovements).toHaveLength(1);
    expect(inventoryMovements[0]).toMatchObject({
      productId: product.id,
      reason: "Manual stock count",
      previousStock: 4,
      newStock: 9,
      quantityChange: 5
    });
    expect(result.inventoryMovement.id).toBe(inventoryMovements[0].id);
  });

  it("records an audit log entry for the adjustment", async () => {
    const product = await prisma.product.create({
      data: {
        tenantId: testTenantId,
        name: `${testProductNamePrefix}${Date.now()}`,
        costPrice: 5,
        salePrice: 8,
        stock: 4
      }
    });

    await adjustProductStock(
      { productId: product.id, newStock: 9, reason: "Manual stock count" },
      testTenantId,
      testUserId
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    const auditLogs = await prisma.auditLog.findMany({
      where: { tenantId: testTenantId, entityId: product.id, action: "INVENTORY_ADJUSTED" }
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].userId).toBe(testUserId);
  });

  it("does not adjust a product belonging to a different tenant", async () => {
    const product = await prisma.product.create({
      data: {
        tenantId: otherTestTenantId,
        name: `${testProductNamePrefix}${Date.now()}`,
        costPrice: 5,
        salePrice: 8,
        stock: 4
      }
    });

    await expect(
      adjustProductStock(
        { productId: product.id, newStock: 9, reason: "Manual stock count" },
        testTenantId,
        testUserId
      )
    ).rejects.toThrow();

    const untouchedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(untouchedProduct.stock).toBe(4);
  });

  it("throws a concurrent conflict error when two adjustments race on the same product", async () => {
    const product = await prisma.product.create({
      data: {
        tenantId: testTenantId,
        name: `${testProductNamePrefix}${Date.now()}`,
        costPrice: 5,
        salePrice: 8,
        stock: 4
      }
    });

    const results = await Promise.allSettled([
      adjustProductStock({ productId: product.id, newStock: 9, reason: "First count" }, testTenantId, testUserId),
      adjustProductStock({ productId: product.id, newStock: 12, reason: "Second count" }, testTenantId, testUserId)
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(StockAdjustmentConcurrentConflictError);

    const finalProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect([9, 12]).toContain(finalProduct.stock);
  });
});

async function deleteStockAdjustmentTestData() {
  const testProducts = await prisma.product.findMany({
    where: { name: { startsWith: testProductNamePrefix } },
    select: { id: true }
  });
  const testProductIds = testProducts.map((p) => p.id);

  const testTenants = await prisma.tenant.findMany({
    where: { email: { in: [testTenantEmail, otherTestTenantEmail] } },
    select: { id: true }
  });
  const testTenantIds = testTenants.map((t) => t.id);

  await prisma.auditLog.deleteMany({ where: { entityId: { in: testProductIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.user.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });
}
