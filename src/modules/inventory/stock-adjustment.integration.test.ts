import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { adjustProductStock } from "./stock-adjustment";

const testProductNamePrefix = "SOLVEN_STOCK_ADJUSTMENT_PRODUCT_";
const testTenantEmail = "solven_stock_adjustment@test.internal";

let testTenantId: string;

describe("adjustProductStock", () => {
  beforeEach(async () => {
    await deleteStockAdjustmentTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Stock Adjustment Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
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

    const result = await adjustProductStock({
      productId: product.id,
      newStock: 9,
      reason: "Manual stock count"
    }, testTenantId);

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
});

async function deleteStockAdjustmentTestData() {
  const testProducts = await prisma.product.findMany({
    where: { name: { startsWith: testProductNamePrefix } },
    select: { id: true }
  });
  const testProductIds = testProducts.map((p) => p.id);

  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
