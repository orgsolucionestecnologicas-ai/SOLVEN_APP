import type { InventoryMovement, Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/modules/audit";

import {
  type AdjustProductStockInput,
  validateAdjustProductStockInput
} from "./stock-adjustment-validation";

export type ProductStockAdjustment = {
  product: Product;
  inventoryMovement: InventoryMovement;
};

export class StockAdjustmentConcurrentConflictError extends Error {
  constructor() {
    super("El stock del producto cambió mientras se procesaba el ajuste. Intenta de nuevo.");
    this.name = "StockAdjustmentConcurrentConflictError";
  }
}

type RawStockAdjustmentResult = {
  id: string;
  previousStock: number | bigint;
  newStock: number | bigint;
};

export async function adjustProductStock(
  adjustmentInput: AdjustProductStockInput,
  tenantId: string,
  userId: string
): Promise<ProductStockAdjustment> {
  const validatedAdjustment = validateAdjustProductStockInput(adjustmentInput);

  const result = await prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findFirstOrThrow({
      where: { id: validatedAdjustment.productId, tenantId }
    });

    const updatedProducts = await transaction.$queryRaw<RawStockAdjustmentResult[]>`
      UPDATE "Product"
      SET "stock" = ${validatedAdjustment.newStock}, "updatedAt" = NOW()
      WHERE "id" = ${product.id} AND "tenantId" = ${tenantId} AND "stock" = ${product.stock}
      RETURNING "id", ${product.stock} AS "previousStock", "stock" AS "newStock"
    `;
    const updatedProduct = updatedProducts[0];

    if (!updatedProduct) {
      throw new StockAdjustmentConcurrentConflictError();
    }

    const previousStock = Number(updatedProduct.previousStock);
    const newStock = Number(updatedProduct.newStock);

    const inventoryMovement = await transaction.inventoryMovement.create({
      data: {
        tenantId,
        productId: validatedAdjustment.productId,
        reason: validatedAdjustment.reason,
        previousStock,
        newStock,
        quantityChange: newStock - previousStock
      }
    });

    const refreshedProduct = await transaction.product.findFirstOrThrow({
      where: { id: validatedAdjustment.productId, tenantId }
    });

    return { product: refreshedProduct, inventoryMovement };
  });

  void logAudit({
    tenantId,
    userId,
    action: "INVENTORY_ADJUSTED",
    entityType: "Product",
    entityId: result.product.id,
    metadata: {
      previousStock: result.inventoryMovement.previousStock,
      newStock: result.inventoryMovement.newStock,
      reason: result.inventoryMovement.reason
    }
  });

  return result;
}
