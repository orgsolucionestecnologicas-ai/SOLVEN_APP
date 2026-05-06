import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ReturnItemInput = {
  productId: string;
  quantity: number;
};

export type ReturnResult = {
  saleId: string;
  returnedItems: number;
  totalReturned: string;
};

export class ReturnValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnValidationError";
  }
}

export async function processReturn(
  saleId: string,
  items: ReturnItemInput[]
): Promise<ReturnResult> {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });

    if (!sale) {
      throw new ReturnValidationError("La venta no fue encontrada.");
    }

    const saleItemByProductId = new Map(
      sale.items.map((item) => [item.productId, item])
    );

    for (const returnItem of items) {
      const saleItem = saleItemByProductId.get(returnItem.productId);

      if (!saleItem) {
        throw new ReturnValidationError(
          `El producto ${returnItem.productId} no pertenece a esta venta.`
        );
      }

      if (returnItem.quantity > saleItem.quantity) {
        throw new ReturnValidationError(
          `La cantidad a devolver (${returnItem.quantity}) supera la cantidad vendida (${saleItem.quantity}).`
        );
      }
    }

    let returnTotal = new Prisma.Decimal(0);

    for (const returnItem of items) {
      const saleItem = saleItemByProductId.get(returnItem.productId)!;

      const updatedProduct = await tx.product.update({
        where: { id: returnItem.productId },
        data: { stock: { increment: returnItem.quantity } },
        select: { stock: true }
      });

      const newStock = updatedProduct.stock;
      const previousStock = newStock - returnItem.quantity;

      await tx.inventoryMovement.create({
        data: {
          productId: returnItem.productId,
          reason: `RETURN:${saleId}`,
          previousStock,
          newStock,
          quantityChange: returnItem.quantity
        }
      });

      returnTotal = returnTotal.plus(saleItem.unitPrice.mul(returnItem.quantity));
    }

    if (sale.paymentType === "CASH") {
      await tx.cashMovement.create({
        data: {
          type: "OUT",
          amount: returnTotal,
          source: "RETURN",
          referenceId: saleId
        }
      });
    }

    return {
      saleId,
      returnedItems: items.length,
      totalReturned: returnTotal.toFixed(2)
    };
  });
}
