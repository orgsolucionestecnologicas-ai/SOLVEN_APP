import { Prisma, ReturnReasonCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ReturnItemInput = {
  productId: string;
  quantity: number;
  restock?: boolean;
};

export const RETURN_REASON_CATEGORIES = [
  "DEFECTO",
  "ERROR_VENTA",
  "CAMBIO_OPINION",
  "OTRO"
] as const satisfies readonly ReturnReasonCategory[];

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

export type ReturnListItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
};

export type ReturnListRecord = {
  id: string;
  saleId: string;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  sale: { id: string; saleDate: Date; customerName: string | null };
  items: ReturnListItem[];
};

export async function listReturns(
  tenantId: string,
  filters: { page?: number; limit?: number; from?: Date; to?: Date; sellerId?: string } = {}
): Promise<{ data: ReturnListRecord[]; total: number }> {
  const { page = 1, limit = 20, from, to, sellerId } = filters;

  const where: Prisma.ReturnWhereInput = {
    sale: { tenantId, ...(sellerId ? { sellerId } : {}) },
    ...((from || to) ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
  };

  const [returns, total] = await prisma.$transaction([
    prisma.return.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        items: true,
        sale: { select: { id: true, saleDate: true, customer: { select: { name: true } } } }
      }
    }),
    prisma.return.count({ where })
  ]);

  const productIds = [...new Set(returns.flatMap((r) => r.items.map((i) => i.productId)))];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, tenantId },
        select: { id: true, name: true }
      })
    : [];
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  const data: ReturnListRecord[] = returns.map((r) => ({
    id: r.id,
    saleId: r.saleId,
    totalAmount: r.totalAmount,
    createdAt: r.createdAt,
    sale: {
      id: r.sale.id,
      saleDate: r.sale.saleDate,
      customerName: r.sale.customer?.name ?? null
    },
    items: r.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: nameById.get(i.productId) ?? i.productId,
      quantity: i.quantity
    }))
  }));

  return { data, total };
}

export async function processReturn(
  saleId: string,
  items: ReturnItemInput[],
  tenantId: string,
  reasonCategory: ReturnReasonCategory,
  reasonNote?: string
): Promise<ReturnResult> {
  if (!RETURN_REASON_CATEGORIES.includes(reasonCategory)) {
    throw new ReturnValidationError("El motivo de la devolución es inválido.");
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId },
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

      if (returnItem.restock !== false) {
        const updatedProduct = await tx.product.update({
          where: { id: returnItem.productId },
          data: { stock: { increment: returnItem.quantity } },
          select: { stock: true }
        });

        const newStock = updatedProduct.stock;
        const previousStock = newStock - returnItem.quantity;

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: returnItem.productId,
            reason: `RETURN:${saleId}`,
            previousStock,
            newStock,
            quantityChange: returnItem.quantity
          }
        });
      }

      returnTotal = returnTotal.plus(saleItem.unitPrice.mul(returnItem.quantity));
    }

    if (sale.paymentType === "CASH") {
      await tx.cashMovement.create({
        data: {
          tenantId,
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
        reasonCategory,
        reasonNote: reasonNote?.trim() || null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            restock: item.restock !== false
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
