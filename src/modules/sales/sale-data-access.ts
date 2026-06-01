import { Prisma, type Product, type Sale, type SaleItem, type Service } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateSaleInput,
  SaleNoCashRegisterOpenError,
  type ValidatedProductSaleItemInput,
  type ValidatedServiceSaleItemInput,
  type ValidatedSaleItemInput,
  validateCreateSaleInput
} from "./sale-validation";

export type CreateSaleWithPromotionsInput = CreateSaleInput & {
  promotionIds?: string[];
  discountAmount?: number;
};

export type SaleWithItems = Sale & {
  items: SaleItem[];
};

export type SaleWithCustomer = Sale & { customer: { name: string } | null };

export type SaleListRecord = Sale & {
  customer: { name: string } | null;
  items: (SaleItem & {
    product: { name: string } | null;
    service: { name: string } | null;
  })[];
};

export class SaleProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product ${productId} was not found.`);
    this.name = "SaleProductNotFoundError";
  }
}

export class SaleInsufficientStockError extends Error {
  constructor(productName: string) {
    super(`Product ${productName} does not have enough stock.`);
    this.name = "SaleInsufficientStockError";
  }
}

export class SaleServiceNotFoundError extends Error {
  constructor(serviceId: string) {
    super(`Service ${serviceId} was not found.`);
    this.name = "SaleServiceNotFoundError";
  }
}

function isProductItem(
  item: ValidatedSaleItemInput
): item is ValidatedProductSaleItemInput {
  return "productId" in item;
}

function isServiceItem(
  item: ValidatedSaleItemInput
): item is ValidatedServiceSaleItemInput {
  return "serviceId" in item;
}

export async function createSale(
  saleInput: CreateSaleWithPromotionsInput,
  tenantId: string
): Promise<SaleWithItems> {
  const validatedSale = validateCreateSaleInput(saleInput);

  if (validatedSale.paymentType === "CASH") {
    const openSession = await prisma.cashRegisterSession.findFirst({
      where: { status: "OPEN", tenantId }
    });
    if (!openSession) {
      throw new SaleNoCashRegisterOpenError();
    }
  }

  const promotionIds = Array.isArray(saleInput.promotionIds)
    ? saleInput.promotionIds.filter((id) => typeof id === "string" && id.trim())
    : [];
  const discountAmount =
    typeof saleInput.discountAmount === "number" && saleInput.discountAmount >= 0
      ? new Prisma.Decimal(saleInput.discountAmount)
      : new Prisma.Decimal(0);

  return prisma.$transaction(async (transaction) => {
    const productItemInputs = validatedSale.items.filter(isProductItem);
    const serviceItemInputs = validatedSale.items.filter(isServiceItem);

    const productIds = [...new Set(productItemInputs.map((item) => item.productId))];
    const serviceIds = [...new Set(serviceItemInputs.map((item) => item.serviceId))];

    const [products, services] = await Promise.all([
      transaction.product.findMany({ where: { id: { in: productIds } } }),
      transaction.service.findMany({ where: { id: { in: serviceIds } } })
    ]);

    const productsById = new Map(products.map((product) => [product.id, product]));
    const servicesById = new Map(services.map((service) => [service.id, service]));

    const productSaleItems = productItemInputs.map((item) =>
      buildProductSaleItem(item, productsById)
    );
    const serviceSaleItems = serviceItemInputs.map((item) =>
      buildServiceSaleItem(item, servicesById)
    );
    const allSaleItems = [...productSaleItems, ...serviceSaleItems];

    const quantityByProductId = getQuantityByProductId(productSaleItems);
    const totalAmount = allSaleItems.reduce(
      (total, item) => total.plus(item.total),
      new Prisma.Decimal(0)
    );

    const sale = await transaction.sale.create({
      data: {
        tenantId,
        paymentType: validatedSale.paymentType,
        customerId:
          validatedSale.paymentType === "CREDIT"
            ? validatedSale.customerId
            : null,
        totalAmount,
        discountAmount
      }
    });

    await transaction.saleItem.createMany({
      data: allSaleItems.map((item) => ({
        saleId: sale.id,
        productId: "productId" in item ? item.productId : null,
        serviceId: "serviceId" in item ? item.serviceId : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }))
    });

    const stockReductionsByProductId = new Map<string, StockReductionResult>();

    for (const productId of productIds) {
      const product = productsById.get(productId);
      const quantity = quantityByProductId.get(productId);

      if (!product || quantity === undefined) {
        throw new SaleProductNotFoundError(productId);
      }

      stockReductionsByProductId.set(
        productId,
        await reduceProductStock(transaction, product, quantity)
      );
    }

    if (productSaleItems.length > 0) {
      await transaction.inventoryMovement.createMany({
        data: buildInventoryMovements(productSaleItems, stockReductionsByProductId).map(
          (item) => ({
            tenantId,
            productId: item.productId,
            reason: `SALE:${sale.id}`,
            previousStock: item.previousStock,
            newStock: item.newStock,
            quantityChange: -item.quantity
          })
        )
      });
    }

    if (validatedSale.paymentType === "CREDIT") {
      const debt = await transaction.debt.create({
        data: {
          tenantId,
          customerId: validatedSale.customerId,
          totalAmount,
          remainingAmount: totalAmount
        }
      });

      await transaction.sale.update({
        where: { id: sale.id },
        data: { debt: { connect: { id: debt.id } } }
      });
    } else {
      await transaction.cashMovement.create({
        data: {
          tenantId,
          type: "IN",
          amount: totalAmount,
          source: "SALE",
          referenceId: sale.id
        }
      });
    }

    if (promotionIds.length > 0) {
      const perPromotionDiscount = discountAmount.div(promotionIds.length);

      await transaction.promotionUsage.createMany({
        data: promotionIds.map((promotionId) => ({
          promotionId,
          saleId: sale.id,
          customerId:
            validatedSale.paymentType === "CREDIT"
              ? validatedSale.customerId
              : null,
          discountAmount: perPromotionDiscount
        }))
      });
    }

    return transaction.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { items: true }
    });
  }, { timeout: 15000 });
}

export async function listSales(tenantId: string): Promise<SaleListRecord[]> {
  return prisma.sale.findMany({
    where: { tenantId },
    orderBy: { saleDate: "desc" },
    include: {
      customer: { select: { name: true } },
      items: {
        include: {
          product: { select: { name: true } },
          service: { select: { name: true } }
        }
      }
    }
  });
}

function buildProductSaleItem(
  item: ValidatedProductSaleItemInput,
  productsById: Map<string, Product>
) {
  const product = productsById.get(item.productId);

  if (!product) {
    throw new SaleProductNotFoundError(item.productId);
  }

  return {
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: product.salePrice,
    total: product.salePrice.mul(item.quantity)
  };
}

function buildServiceSaleItem(
  item: ValidatedServiceSaleItemInput,
  servicesById: Map<string, Service>
) {
  const service = servicesById.get(item.serviceId);

  if (!service) {
    throw new SaleServiceNotFoundError(item.serviceId);
  }

  return {
    serviceId: item.serviceId,
    quantity: item.quantity,
    unitPrice: service.price,
    total: service.price.mul(item.quantity)
  };
}

function getQuantityByProductId(
  saleItems: Array<{ productId: string; quantity: number }>
) {
  const quantityByProductId = new Map<string, number>();

  for (const item of saleItems) {
    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) ?? 0) + item.quantity
    );
  }

  return quantityByProductId;
}

type StockReductionResult = {
  id: string;
  previousStock: number;
  newStock: number;
};

type RawStockReductionResult = {
  id: string;
  previousStock: number | bigint;
  newStock: number | bigint;
};

async function reduceProductStock(
  transaction: Prisma.TransactionClient,
  product: Product,
  quantity: number
) {
  const updatedProducts = await transaction.$queryRaw<RawStockReductionResult[]>`
    UPDATE "Product"
    SET "stock" = "stock" - ${quantity}, "updatedAt" = NOW()
    WHERE "id" = ${product.id} AND "stock" >= ${quantity}
    RETURNING "id", "stock" + ${quantity} AS "previousStock", "stock" AS "newStock"
  `;
  const updatedProduct = updatedProducts[0];

  if (!updatedProduct) {
    throw new SaleInsufficientStockError(product.name);
  }

  return {
    id: updatedProduct.id,
    previousStock: Number(updatedProduct.previousStock),
    newStock: Number(updatedProduct.newStock)
  };
}

function buildInventoryMovements(
  saleItems: Array<{ productId: string; quantity: number }>,
  stockReductionsByProductId: Map<string, StockReductionResult>
) {
  const currentStockByProductId = new Map(
    [...stockReductionsByProductId].map(([productId, stockReduction]) => [
      productId,
      stockReduction.previousStock
    ])
  );

  return saleItems.map((item) => {
    const previousStock = currentStockByProductId.get(item.productId);

    if (previousStock === undefined) {
      throw new SaleProductNotFoundError(item.productId);
    }

    const newStock = previousStock - item.quantity;
    currentStockByProductId.set(item.productId, newStock);

    return {
      productId: item.productId,
      quantity: item.quantity,
      previousStock,
      newStock
    };
  });
}
