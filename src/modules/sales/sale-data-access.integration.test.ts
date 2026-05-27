import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  createSale,
  listSales,
  SaleInsufficientStockError,
  SaleProductNotFoundError
} from "./sale-data-access";

const testProductNamePrefix = "SOLVEN_SALE_TEST_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_SALE_TEST_CUSTOMER_";
const testCashierName = "SOLVEN_SALE_TEST_CASHIER";

describe("sale data access", () => {
  beforeEach(async () => {
    await deleteSaleTestData();
    await prisma.cashRegisterSession.create({
      data: { cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteSaleTestData();
    await prisma.$disconnect();
  });

  it("creates a sale, sale items, product stock updates, and inventory movements atomically", async () => {
    const firstProduct = await createTestProduct("RICE", 10, 5);
    const secondProduct = await createTestProduct("BEANS", 4.5, 8);

    const sale = await createSale({
      items: [
        {
          productId: firstProduct.id,
          quantity: 2
        },
        {
          productId: secondProduct.id,
          quantity: 3
        }
      ]
    });

    const updatedFirstProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: firstProduct.id
      }
    });
    const updatedSecondProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: secondProduct.id
      }
    });
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: {
        reason: `SALE:${sale.id}`
      },
      orderBy: {
        productId: "asc"
      }
    });
    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: {
        source: "SALE",
        referenceId: sale.id
      }
    });

    expect(sale.totalAmount.toString()).toBe("33.5");
    expect(sale).toMatchObject({
      paymentType: "CASH",
      customerId: null,
      debtId: null
    });
    expect(sale.items).toHaveLength(2);
    expect(updatedFirstProduct.stock).toBe(3);
    expect(updatedSecondProduct.stock).toBe(5);
    expect(inventoryMovements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: firstProduct.id,
          previousStock: 5,
          newStock: 3,
          quantityChange: -2
        }),
        expect.objectContaining({
          productId: secondProduct.id,
          previousStock: 8,
          newStock: 5,
          quantityChange: -3
        })
      ])
    );
    expect(cashMovement.amount.toString()).toBe("33.5");
    expect(cashMovement).toMatchObject({
      type: "IN",
      source: "SALE",
      referenceId: sale.id
    });
  });

  it("creates a credit sale with debt and without cash movement", async () => {
    const product = await createTestProduct("CREDIT", 11, 7);
    const customer = await createTestCustomer();

    const sale = await createSale({
      paymentType: "CREDIT",
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          quantity: 3
        }
      ]
    });

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: product.id
      }
    });
    const inventoryMovement = await prisma.inventoryMovement.findFirstOrThrow({
      where: {
        reason: `SALE:${sale.id}`,
        productId: product.id
      }
    });
    const debt = await prisma.debt.findUniqueOrThrow({
      where: {
        id: sale.debtId ?? ""
      }
    });
    const cashMovement = await prisma.cashMovement.findFirst({
      where: {
        source: "SALE",
        referenceId: sale.id
      }
    });

    expect(sale.totalAmount.toString()).toBe("33");
    expect(sale).toMatchObject({
      paymentType: "CREDIT",
      customerId: customer.id,
      debtId: debt.id
    });
    expect(updatedProduct.stock).toBe(4);
    expect(inventoryMovement).toMatchObject({
      productId: product.id,
      previousStock: 7,
      newStock: 4,
      quantityChange: -3
    });
    expect(debt.totalAmount.toString()).toBe("33");
    expect(debt.remainingAmount.toString()).toBe("33");
    expect(cashMovement).toBeNull();
  });

  it("rejects a sale when a product does not exist", async () => {
    await expect(
      createSale({
        items: [
          {
            productId: "missing-product",
            quantity: 1
          }
        ]
      })
    ).rejects.toThrow(SaleProductNotFoundError);
  });

  it("rejects a sale when stock is insufficient and does not create records", async () => {
    const product = await createTestProduct("LOW_STOCK", 8, 1);

    await expect(
      createSale({
        items: [
          {
            productId: product.id,
            quantity: 2
          }
        ]
      })
    ).rejects.toThrow(SaleInsufficientStockError);

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: product.id
      }
    });
    const saleItems = await prisma.saleItem.findMany({
      where: {
        productId: product.id
      }
    });
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: {
        productId: product.id
      }
    });

    expect(updatedProduct.stock).toBe(1);
    expect(saleItems).toHaveLength(0);
    expect(inventoryMovements).toHaveLength(0);
  });

  it("prevents concurrent sales from overselling product stock", async () => {
    const product = await createTestProduct("CONCURRENT", 8, 1);

    const results = await Promise.allSettled([
      createSale({
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ]
      }),
      createSale({
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ]
      })
    ]);

    const fulfilledResults = results.filter(
      (result) => result.status === "fulfilled"
    );
    const rejectedResults = results.filter(
      (result) => result.status === "rejected"
    );
    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: product.id
      }
    });
    const saleItems = await prisma.saleItem.findMany({
      where: {
        productId: product.id
      }
    });
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: {
        productId: product.id
      }
    });
    const cashMovements = await prisma.cashMovement.findMany({
      where: {
        source: "SALE",
        referenceId: {
          in: saleItems.map((saleItem) => saleItem.saleId)
        }
      }
    });

    expect(fulfilledResults).toHaveLength(1);
    expect(rejectedResults).toHaveLength(1);
    expect(rejectedResults[0].reason).toBeInstanceOf(
      SaleInsufficientStockError
    );
    expect(updatedProduct.stock).toBe(0);
    expect(saleItems).toHaveLength(1);
    expect(inventoryMovements).toHaveLength(1);
    expect(inventoryMovements[0]).toMatchObject({
      previousStock: 1,
      newStock: 0,
      quantityChange: -1
    });
    expect(cashMovements).toHaveLength(1);
  });

  it("lists sales after creation", async () => {
    const product = await createTestProduct("LIST", 6, 3);
    const sale = await createSale({
      items: [
        {
          productId: product.id,
          quantity: 1
        }
      ]
    });

    const sales = await listSales();

    expect(sales).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: sale.id
        })
      ])
    );
  });
});

async function createTestProduct(
  nameSuffix: string,
  salePrice: number,
  stock: number
) {
  return prisma.product.create({
    data: {
      name: `${testProductNamePrefix}${nameSuffix}_${Date.now()}`,
      costPrice: 1,
      salePrice,
      stock
    }
  });
}

async function createTestCustomer() {
  return prisma.customer.create({
    data: {
      name: `${testCustomerNamePrefix}${Date.now()}`
    }
  });
}

async function deleteSaleTestData() {
  const testProducts = await prisma.product.findMany({
    where: {
      name: {
        startsWith: testProductNamePrefix
      }
    },
    select: {
      id: true
    }
  });
  const testProductIds = testProducts.map((product) => product.id);
  const testSaleItems = await prisma.saleItem.findMany({
    where: {
      productId: {
        in: testProductIds
      }
    },
    select: {
      saleId: true
    }
  });
  const testSaleIds = [
    ...new Set(testSaleItems.map((saleItem) => saleItem.saleId))
  ];
  const testCustomers = await prisma.customer.findMany({
    where: {
      name: {
        startsWith: testCustomerNamePrefix
      }
    },
    select: {
      id: true
    }
  });
  const testCustomerIds = testCustomers.map((customer) => customer.id);
  const testDebts = await prisma.debt.findMany({
    where: {
      customerId: {
        in: testCustomerIds
      }
    },
    select: {
      id: true
    }
  });
  const testDebtIds = testDebts.map((debt) => debt.id);

  await prisma.inventoryMovement.deleteMany({
    where: {
      productId: {
        in: testProductIds
      }
    }
  });
  await prisma.cashMovement.deleteMany({
    where: {
      source: "SALE",
      referenceId: {
        in: testSaleIds
      }
    }
  });
  await prisma.debtPayment.deleteMany({
    where: {
      debtId: {
        in: testDebtIds
      }
    }
  });
  await prisma.debt.deleteMany({
    where: {
      id: {
        in: testDebtIds
      }
    }
  });
  await prisma.saleItem.deleteMany({
    where: {
      productId: {
        in: testProductIds
      }
    }
  });
  await prisma.sale.deleteMany({
    where: {
      id: {
        in: testSaleIds
      }
    }
  });
  await prisma.product.deleteMany({
    where: {
      id: {
        in: testProductIds
      }
    }
  });
  await prisma.customer.deleteMany({
    where: {
      id: {
        in: testCustomerIds
      }
    }
  });
  await prisma.cashRegisterSession.deleteMany({
    where: { cashierName: testCashierName }
  });
}
