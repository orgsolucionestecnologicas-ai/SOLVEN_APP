import { Prisma, ReturnReasonCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SaleNoCashRegisterOpenError } from "../sales";

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

export class ReturnConcurrentConflictError extends Error {
  constructor() {
    super(
      "La devolución no se pudo procesar porque otra operación modificó la misma venta al mismo tiempo. Volvé a intentarlo."
    );
    this.name = "ReturnConcurrentConflictError";
  }
}

export type ReturnListItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
};

export const RETURN_REFUND_METHODS = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "VentaWeb",
  "Otro"
] as const;

export type ReturnRefundMethod = (typeof RETURN_REFUND_METHODS)[number];

export type ReturnListRecord = {
  id: string;
  saleId: string;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  reasonCategory: ReturnReasonCategory;
  reasonNote: string | null;
  refundMethod: string | null;
  sale: { id: string; folio: number; saleDate: Date; customerName: string | null };
  items: ReturnListItem[];
};

export async function listReturns(
  tenantId: string,
  filters: {
    page?: number;
    limit?: number;
    from?: Date;
    to?: Date;
    sellerId?: string;
    reasonCategory?: ReturnReasonCategory;
    search?: string;
  } = {}
): Promise<{ data: ReturnListRecord[]; total: number }> {
  const { page = 1, limit = 20, from, to, sellerId, reasonCategory, search } = filters;

  const trimmedSearch = search?.trim();
  const searchAsFolio = trimmedSearch && /^\d+$/.test(trimmedSearch) ? Number(trimmedSearch) : undefined;

  const where: Prisma.ReturnWhereInput = {
    sale: {
      tenantId,
      ...(sellerId ? { sellerId } : {}),
      ...(trimmedSearch
        ? {
            OR: [
              ...(searchAsFolio !== undefined ? [{ folio: searchAsFolio }] : []),
              { customer: { name: { contains: trimmedSearch, mode: "insensitive" as const } } }
            ]
          }
        : {})
    },
    ...(reasonCategory ? { reasonCategory } : {}),
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
        sale: { select: { id: true, folio: true, saleDate: true, customer: { select: { name: true } } } }
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
    reasonCategory: r.reasonCategory,
    reasonNote: r.reasonNote,
    refundMethod: r.refundMethod,
    sale: {
      id: r.sale.id,
      folio: r.sale.folio,
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

export type ReturnDetailItem = ReturnListItem & {
  unitPrice: Prisma.Decimal;
  total: Prisma.Decimal;
};

export type ReturnDetailRecord = Omit<ReturnListRecord, "items"> & {
  items: ReturnDetailItem[];
};

export async function getReturnById(
  id: string,
  tenantId: string
): Promise<ReturnDetailRecord | null> {
  const returnRecord = await prisma.return.findFirst({
    where: { id, sale: { tenantId } },
    include: {
      items: true,
      sale: {
        select: {
          id: true,
          folio: true,
          saleDate: true,
          customer: { select: { name: true } },
          items: true
        }
      }
    }
  });

  if (!returnRecord) {
    return null;
  }

  const productIds = [...new Set(returnRecord.items.map((i) => i.productId))];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, tenantId },
        select: { id: true, name: true }
      })
    : [];
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const saleItemByProductId = new Map(
    returnRecord.sale.items.map((si) => [si.productId, si])
  );

  return {
    id: returnRecord.id,
    saleId: returnRecord.saleId,
    totalAmount: returnRecord.totalAmount,
    createdAt: returnRecord.createdAt,
    reasonCategory: returnRecord.reasonCategory,
    reasonNote: returnRecord.reasonNote,
    refundMethod: returnRecord.refundMethod,
    sale: {
      id: returnRecord.sale.id,
      folio: returnRecord.sale.folio,
      saleDate: returnRecord.sale.saleDate,
      customerName: returnRecord.sale.customer?.name ?? null
    },
    items: returnRecord.items.map((i) => {
      const unitPrice = saleItemByProductId.get(i.productId)?.unitPrice ?? new Prisma.Decimal(0);
      return {
        id: i.id,
        productId: i.productId,
        productName: nameById.get(i.productId) ?? i.productId,
        quantity: i.quantity,
        unitPrice,
        total: unitPrice.mul(i.quantity)
      };
    })
  };
}

type SalePaymentDetail = { method: string; amount: number; reference?: string };

function parsePaymentDetailsServerSide(value: unknown): SalePaymentDetail[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.filter(
    (v): v is SalePaymentDetail =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as SalePaymentDetail).method === "string" &&
      typeof (v as SalePaymentDetail).amount === "number"
  );
  return parsed.length > 0 ? parsed : null;
}

function proratedUnitPrice(
  unitPrice: Prisma.Decimal,
  saleTotalAmount: Prisma.Decimal,
  saleDiscountAmount: Prisma.Decimal
): Prisma.Decimal {
  if (saleTotalAmount.isZero()) {
    return unitPrice;
  }
  return unitPrice.mul(new Prisma.Decimal(1).minus(saleDiscountAmount.div(saleTotalAmount)));
}

export async function processReturn(
  saleId: string,
  items: ReturnItemInput[],
  tenantId: string,
  reasonCategory: ReturnReasonCategory,
  reasonNote?: string,
  refundMethod?: string,
  refundReference?: string
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

    if (sale.paymentType !== "CREDIT" && !refundMethod) {
      throw new ReturnValidationError("Debés indicar cómo se reintegra el dinero.");
    }

    const salePaidWithCard =
      parsePaymentDetailsServerSide(sale.paymentDetails)?.some((p) => p.method === "Tarjeta") ?? false;
    if (salePaidWithCard && refundMethod !== "Tarjeta") {
      throw new ReturnValidationError(
        "Esta venta se pagó con tarjeta — el reintegro debe hacerse con tarjeta."
      );
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

      const netUnitPrice = proratedUnitPrice(saleItem.unitPrice, sale.totalAmount, sale.discountAmount);
      returnTotal = returnTotal.plus(netUnitPrice.mul(returnItem.quantity));
    }

    if (refundMethod === "Efectivo") {
      const openSession = await tx.cashRegisterSession.findFirst({
        where: { status: "OPEN", tenantId }
      });
      if (!openSession) {
        throw new SaleNoCashRegisterOpenError();
      }

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

    if ((sale.paymentType === "CREDIT" || sale.paymentType === "MIXED") && sale.debtId) {
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
        refundMethod: sale.paymentType === "CREDIT" ? null : refundMethod,
        refundReference: sale.paymentType === "CREDIT" ? null : refundReference?.trim() || null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            restock: item.restock !== false
          }))
        }
      }
    });

    const isFullReturn = sale.items.every((saleItem) => {
      if (!saleItem.productId) return true;
      const alreadyReturned = alreadyReturnedByProductId.get(saleItem.productId) ?? 0;
      const returningNow =
        items.find((item) => item.productId === saleItem.productId)?.quantity ?? 0;
      return alreadyReturned + returningNow >= saleItem.quantity;
    });

    if (isFullReturn) {
      await tx.promotionUsage.deleteMany({ where: { saleId } });
    }

    return {
      returnId: returnRecord.id,
      saleId,
      returnedItems: items.length,
      totalReturned: returnTotal.toFixed(2)
    };
  }, { timeout: 15000, isolationLevel: "Serializable" }).catch((error) => {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2028")
    ) {
      throw new ReturnConcurrentConflictError();
    }
    throw error;
  });
}
