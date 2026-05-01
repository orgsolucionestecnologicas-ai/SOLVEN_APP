import type { InventoryMovement, Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type AdjustProductStockInput,
  validateAdjustProductStockInput
} from "./stock-adjustment-validation";

export type ProductStockAdjustment = {
  product: Product;
  inventoryMovement: InventoryMovement;
};

export async function adjustProductStock(
  adjustmentInput: AdjustProductStockInput
): Promise<ProductStockAdjustment> {
  const validatedAdjustment = validateAdjustProductStockInput(adjustmentInput);

  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findUniqueOrThrow({
      where: {
        id: validatedAdjustment.productId
      }
    });
    const previousStock = product.stock;
    const quantityChange = validatedAdjustment.newStock - previousStock;

    const updatedProduct = await transaction.product.update({
      where: {
        id: validatedAdjustment.productId
      },
      data: {
        stock: validatedAdjustment.newStock
      }
    });

    const inventoryMovement = await transaction.inventoryMovement.create({
      data: {
        productId: validatedAdjustment.productId,
        reason: validatedAdjustment.reason,
        previousStock,
        newStock: validatedAdjustment.newStock,
        quantityChange
      }
    });

    return {
      product: updatedProduct,
      inventoryMovement
    };
  });
}
