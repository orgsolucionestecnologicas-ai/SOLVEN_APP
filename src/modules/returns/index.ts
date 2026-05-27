import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ReturnItemInput = {
  productId: string;
  quantity: number;
};

export type ReturnResult = {
  returnId: string;
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

    // Sum quantities already returned for each product on this sale
    const existingReturnItems = await tx.returnItem.findMany({
      where: { return: { saleId } }
    });
    const alreadyReturnedByProductId = new Map<string, number>();
    for (const ri of existingReturnItems) {
      alreadyReturnedByProductId.set(
        ri.productId,
        (alreadyReturnedByProductId.get(ri.productId) ?? 0) + ri.quantity
      );
    }

    for (const returnItem of items) {
      const saleItem = saleItemByProductId.get(returnItem.productId);

      if (!saleItem) {
        throw new ReturnValidationError(
          `El producto ${returnItem.productId} no pertenece a esta venta.`
        );
      }

      const alreadyReturned = alreadyReturnedByProductId.get(returnItem.productId) ?? 0;
      if (alreadyReturned + returnItem.quantity > saleItem.quantity) {
        throw new ReturnValidationError(
          `La cantidad a devolver (${alreadyReturned + returnItem.quantity}) supera el máximo permitido (${saleItem.quantity}) para el producto ${returnItem.productId}.`
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

    if (sale.paymentType === "CREDIT" && sale.debtId) {
      const debt = await tx.debt.findUnique({ where: { id: sale.debtId } });
      if (debt) {
        const newRemaining = debt.remainingAmount.minus(returnTotal);
        await tx.debt.update({
          where: { id: sale.debtId },
          data: {
            remainingAmount: newRemaining.lessThan(0)
              ? new Prisma.Decimal(0)
              : newRemaining
          }
        });
      }
    }

    const returnRecord = await tx.return.create({
      data: {
        saleId,
        totalAmount: returnTotal,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        }
      }
    });

    return {
      returnId: returnRecord.id,
      saleId,
      returnedItems: items.length,
      totalReturned: returnTotal.toFixed(2)
    };
  });
}
