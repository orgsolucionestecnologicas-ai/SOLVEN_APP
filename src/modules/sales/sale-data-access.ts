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

export type SaleWithCustomer = Sale & { customer: { name: string } | null };

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
    const saleItems = validatedSale.items.map((item) =>
      buildSaleItem(item, productsById)
    );
    const quantityByProductId = getQuantityByProductId(saleItems);
    const totalAmount = saleItems.reduce(
      (total, item) => total.plus(item.total),
      new Prisma.Decimal(0)
    );
    const sale = await transaction.sale.create({
      data: {
        paymentType: validatedSale.paymentType,
        customer:
          validatedSale.paymentType === "CREDIT"
            ? {
                connect: {
                  id: validatedSale.customerId
                }
              }
            : undefined,
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

    await transaction.inventoryMovement.createMany({
      data: buildInventoryMovements(saleItems, stockReductionsByProductId).map((item) => ({
        productId: item.productId,
        reason: `SALE:${sale.id}`,
        previousStock: item.previousStock,
        newStock: item.newStock,
        quantityChange: -item.quantity
      }))
    });

    if (validatedSale.paymentType === "CREDIT") {
      const debt = await transaction.debt.create({
        data: {
          customer: {
            connect: {
              id: validatedSale.customerId
            }
          },
          totalAmount,
          remainingAmount: totalAmount
        }
      });

      await transaction.sale.update({
        where: {
          id: sale.id
        },
        data: {
          debt: {
            connect: {
              id: debt.id
            }
          }
        }
      });
    } else {
      await transaction.cashMovement.create({
        data: {
          type: "IN",
          amount: totalAmount,
          source: "SALE",
          referenceId: sale.id
        }
      });
    }

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

export async function listSales(): Promise<SaleWithCustomer[]> {
  return prisma.sale.findMany({
    orderBy: {
      saleDate: "desc"
    },
    include: {
      customer: {
        select: { name: true }
      }
    }
  });
}

function buildSaleItem(
  item: ValidatedSaleItemInput,
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

function getQuantityByProductId(
  saleItems: Array<{
    productId: string;
    quantity: number;
  }>
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
  saleItems: Array<{
    productId: string;
    quantity: number;
  }>,
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
