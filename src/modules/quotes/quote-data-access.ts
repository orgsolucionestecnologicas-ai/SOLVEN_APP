import { Prisma, type Quote, type QuoteItem, type Sale, type SaleItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/generate-code";
import {
  type CreateQuoteInput,
  QuoteAlreadyConfirmedError,
  QuoteExpiredError,
  QuoteNotFoundError,
  validateCreateQuoteInput,
} from "./quote-validation";

export type QuoteWithItems = Quote & {
  items: QuoteItem[];
  customer: { name: string } | null;
};

export type QuoteListRecord = Quote & {
  customer: { name: string } | null;
  items: QuoteItem[];
};

export type SaleWithItems = Sale & { items: SaleItem[] };

export async function createQuote(
  input: CreateQuoteInput,
  tenantId: string
): Promise<QuoteWithItems> {
  validateCreateQuoteInput(input);

  const quoteNumber = await generateCode("COT");
  const now = new Date();
  const validUntil = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const customerId = typeof input.customerId === "string" && input.customerId.trim()
      ? input.customerId.trim()
      : null;

    if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) throw new Error("Cliente no encontrado.");
    }

    const productIds = input.items
      .filter((i) => i.productId)
      .map((i) => i.productId as string);
    const serviceIds = input.items
      .filter((i) => i.serviceId)
      .map((i) => i.serviceId as string);

    const [products, services] = await Promise.all([
      productIds.length
        ? tx.product.findMany({ where: { id: { in: productIds }, tenantId } })
        : Promise.resolve([]),
      serviceIds.length
        ? tx.service.findMany({ where: { id: { in: serviceIds }, tenantId } })
        : Promise.resolve([]),
    ]);

    const productsById = new Map(products.map((p) => [p.id, p]));
    const servicesById = new Map(services.map((s) => [s.id, s]));

    let total = new Prisma.Decimal(0);
    const itemsData: Array<{
      productId: string | null;
      serviceId: string | null;
      name: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      total: Prisma.Decimal;
    }> = [];

    for (const item of input.items) {
      if (item.productId) {
        const product = productsById.get(item.productId);
        if (!product) throw new Error(`Producto ${item.productId} no encontrado.`);
        const lineTotal = product.salePrice.mul(item.quantity);
        total = total.plus(lineTotal);
        itemsData.push({
          productId: product.id,
          serviceId: null,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          total: lineTotal,
        });
      } else if (item.serviceId) {
        const service = servicesById.get(item.serviceId);
        if (!service) throw new Error(`Servicio ${item.serviceId} no encontrado.`);
        const lineTotal = service.price.mul(item.quantity);
        total = total.plus(lineTotal);
        itemsData.push({
          productId: null,
          serviceId: service.id,
          name: service.name,
          quantity: item.quantity,
          unitPrice: service.price,
          total: lineTotal,
        });
      }
    }

    const discountAmount =
      typeof input.discountAmount === "number" && input.discountAmount >= 0
        ? new Prisma.Decimal(input.discountAmount)
        : new Prisma.Decimal(0);

    const resolvedCustomerName = customerId
      ? ((await tx.customer.findUnique({ where: { id: customerId } }))?.name ?? input.customerName ?? "")
      : (input.customerName ?? "");

    const quote = await tx.quote.create({
      data: {
        tenantId,
        quoteNumber,
        customerId,
        customerName: resolvedCustomerName,
        customerEmail: input.customerEmail?.trim() ?? "",
        customerPhone: input.customerPhone?.trim() ?? "",
        totalAmount: total,
        discountAmount,
        notes: input.notes ?? null,
        validUntil,
        items: {
          create: itemsData,
        },
      },
    });

    return tx.quote.findUniqueOrThrow({
      where: { id: quote.id },
      include: { items: true, customer: { select: { name: true } } },
    });
  });
}

export type QuoteFilters = {
  page?: number;
  limit?: number;
  from?: Date;
  to?: Date;
  status?: string;
  customerId?: string;
  search?: string;
};

export async function listQuotes(
  tenantId: string,
  filters: QuoteFilters = {}
): Promise<{ data: QuoteListRecord[]; total: number }> {
  const { page = 1, limit = 20, from, to, status, customerId, search } = filters;

  const where: Prisma.QuoteWhereInput = { tenantId };

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (status) {
    where.status = status as Quote["status"];
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (search) {
    where.OR = [
      { quoteNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }

  const now = new Date();
  const [rawData, total] = await prisma.$transaction([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        customer: { select: { name: true } },
        items: true,
      },
    }),
    prisma.quote.count({ where }),
  ]);

  const expiredIds = rawData
    .filter((q) => (q.status === "DRAFT" || q.status === "SENT") && q.validUntil < now)
    .map((q) => q.id);

  if (expiredIds.length > 0) {
    await prisma.quote.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "EXPIRED" },
    });
    for (const q of rawData) {
      if (expiredIds.includes(q.id)) {
        q.status = "EXPIRED";
      }
    }
  }

  return { data: rawData, total };
}

export async function getQuoteById(quoteId: string, tenantId: string): Promise<QuoteWithItems> {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, tenantId },
    include: { items: true, customer: { select: { name: true } } },
  });

  if (!quote) throw new QuoteNotFoundError();

  const now = new Date();
  if ((quote.status === "DRAFT" || quote.status === "SENT") && quote.validUntil < now) {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "EXPIRED" } });
    quote.status = "EXPIRED";
  }

  return quote;
}

export async function confirmQuote(
  quoteId: string,
  tenantId: string
): Promise<SaleWithItems> {
  const quote = await getQuoteById(quoteId, tenantId);

  if (quote.status === "CONFIRMED") throw new QuoteAlreadyConfirmedError();
  if (quote.status === "CANCELLED" || quote.status === "EXPIRED") {
    throw new Error("No se puede confirmar una cotización cancelada o expirada.");
  }

  const now = new Date();
  if (quote.validUntil < now) throw new QuoteExpiredError();

  return prisma.$transaction(
    async (tx) => {
      const productItems = quote.items.filter((i) => i.productId !== null);

      for (const item of productItems) {
        const updated = await tx.$queryRaw<{ id: string; newStock: number }[]>`
          UPDATE "Product"
          SET "stock" = "stock" - ${item.quantity}, "updatedAt" = NOW()
          WHERE "id" = ${item.productId} AND "stock" >= ${item.quantity}
          RETURNING "id", "stock" AS "newStock"
        `;
        if (!updated[0]) {
          throw new Error(`Stock insuficiente para el producto ${item.name}.`);
        }
      }

      const lastSale = await tx.sale.findFirst({
        where: { tenantId },
        orderBy: { folio: "desc" },
        select: { folio: true },
      });
      const nextFolio = (lastSale?.folio ?? 0) + 1;

      const totalAmount = quote.totalAmount;
      const discountAmount = quote.discountAmount;

      const sale = await tx.sale.create({
        data: {
          tenantId,
          folio: nextFolio,
          paymentType: "CASH",
          customerId: null,
          totalAmount,
          discountAmount,
        },
      });

      await tx.saleItem.createMany({
        data: quote.items.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ivaRate: 0.21,
          total: item.total,
        })),
      });

      for (const item of productItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId! },
          select: { stock: true },
        });
        const newStock = product?.stock ?? 0;
        const previousStock = newStock + item.quantity;

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: item.productId!,
            reason: `SALE:${sale.id}`,
            previousStock,
            newStock,
            quantityChange: -item.quantity,
          },
        });
      }

      await tx.cashMovement.create({
        data: {
          tenantId,
          type: "IN",
          amount: totalAmount,
          source: "SALE",
          referenceId: sale.id,
        },
      });

      await tx.quote.update({
        where: { id: quoteId },
        data: { status: "CONFIRMED", confirmedAt: now, saleId: sale.id },
      });

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { items: true },
      });
    },
    { timeout: 15000 }
  );
}

export async function cancelQuote(quoteId: string, tenantId: string): Promise<Quote> {
  const quote = await getQuoteById(quoteId, tenantId);

  if (quote.status === "CONFIRMED") throw new QuoteAlreadyConfirmedError();

  return prisma.quote.update({
    where: { id: quoteId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export async function expireOverdueQuotes(tenantId?: string): Promise<number> {
  const where: Prisma.QuoteWhereInput = {
    status: { in: ["DRAFT", "SENT"] },
    validUntil: { lt: new Date() },
    ...(tenantId ? { tenantId } : {}),
  };

  const result = await prisma.quote.updateMany({
    where,
    data: { status: "EXPIRED" },
  });

  return result.count;
}

export async function getExpiringQuotes(
  tenantId: string,
  hoursAhead = 24
): Promise<QuoteWithItems[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return prisma.quote.findMany({
    where: {
      tenantId,
      status: { in: ["DRAFT", "SENT"] },
      validUntil: { gte: now, lte: cutoff },
    },
    include: { items: true, customer: { select: { name: true } } },
    orderBy: { validUntil: "asc" },
  });
}

export async function getReservedStockByProduct(
  tenantId: string
): Promise<Map<string, number>> {
  const now = new Date();

  const items = await prisma.quoteItem.findMany({
    where: {
      productId: { not: null },
      quote: {
        tenantId,
        status: { in: ["DRAFT", "SENT"] },
        validUntil: { gte: now },
      },
    },
    select: { productId: true, quantity: true },
  });

  const map = new Map<string, number>();
  for (const item of items) {
    if (!item.productId) continue;
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }

  return map;
}
