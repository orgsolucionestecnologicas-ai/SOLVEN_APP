import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { adjustProductStock } from "./stock-adjustment";

const testProductNamePrefix = "SOLVEN_STOCK_ADJUSTMENT_PRODUCT_";

describe("adjustProductStock", () => {
  beforeEach(async () => {
    await deleteStockAdjustmentTestData();
  });

  afterAll(async () => {
    await deleteStockAdjustmentTestData();
    await prisma.$disconnect();
  });

  it("updates product stock and records an inventory movement atomically", async () => {
    const product = await prisma.product.create({
      data: {
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
    });

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: product.id
      }
    });
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: {
        productId: product.id
      }
    });

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

  await prisma.inventoryMovement.deleteMany({
    where: {
      productId: {
        in: testProductIds
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
}
