import { Prisma, type Product, type Sale, type SaleItem } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateSaleInput,
  type ValidatedSaleItemInput,
  validateCreateSaleInput
} from "./sale-validation";

export type SaleWithItems = Sale & {
  items: SaleItem[];
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

export async function createSale(
  saleInput: CreateSaleInput
): Promise<SaleWithItems> {
  const validatedSale = validateCreateSaleInput(saleInput);

  return prisma.$transaction(async (transaction) => {
    const productIds = [
      ...new Set(validatedSale.items.map((item) => item.productId))
    ];
    const products = await transaction.product.findMany({
      where: {
        id: {
          in: productIds
        }
      }
    });
    const productsById = new Map(
      products.map((product) => [product.id, product])
    );
    const stockByProductId = new Map(
      products.map((product) => [product.id, product.stock])
    );
    const saleItems = validatedSale.items.map((item) =>
      buildSaleItem(item, productsById, stockByProductId)
    );
    const totalAmount = saleItems.reduce(
      (total, item) => total.plus(item.total),
      new Prisma.Decimal(0)
    );
    const sale = await transaction.sale.create({
      data: {
        totalAmount
      }
    });

    await transaction.saleItem.createMany({
      data: saleItems.map((item) => ({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }))
    });

    await Promise.all(
      productIds.map((productId) =>
        transaction.product.update({
          where: {
            id: productId
          },
          data: {
            stock: stockByProductId.get(productId)
          }
        })
      )
    );

    await transaction.inventoryMovement.createMany({
      data: saleItems.map((item) => ({
        productId: item.productId,
        reason: `SALE:${sale.id}`,
        previousStock: item.previousStock,
        newStock: item.newStock,
        quantityChange: -item.quantity
      }))
    });

    return transaction.sale.findUniqueOrThrow({
      where: {
        id: sale.id
      },
      include: {
        items: true
      }
    });
  });
}

export async function listSales(): Promise<Sale[]> {
  return prisma.sale.findMany({
    orderBy: {
      saleDate: "desc"
    }
  });
}

function buildSaleItem(
  item: ValidatedSaleItemInput,
  productsById: Map<string, Product>,
  stockByProductId: Map<string, number>
) {
  const product = productsById.get(item.productId);

  if (!product) {
    throw new SaleProductNotFoundError(item.productId);
  }

  const previousStock = stockByProductId.get(item.productId) ?? product.stock;

  if (previousStock < item.quantity) {
    throw new SaleInsufficientStockError(product.name);
  }

  const newStock = previousStock - item.quantity;
  stockByProductId.set(item.productId, newStock);

  return {
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: product.salePrice,
    total: product.salePrice.mul(item.quantity),
    previousStock,
    newStock
  };
}
