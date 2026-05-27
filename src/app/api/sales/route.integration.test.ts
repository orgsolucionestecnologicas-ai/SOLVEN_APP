import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { GET, POST } from "./route";

const testProductNamePrefix = "SOLVEN_INTEGRATION_SALE_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_INTEGRATION_SALE_CUSTOMER_";
const testCashierName = "SOLVEN_INTEGRATION_SALE_CASHIER";

describe("sales API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationSaleData();
    await prisma.cashRegisterSession.create({
      data: { cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteIntegrationSaleData();
    await prisma.$disconnect();
  });

  it("creates a sale through the API flow", async () => {
    const product = await createIntegrationProduct("CREATE", 12.5, 5);

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              productId: product.id,
              quantity: 2
            }
          ]
        })
      })
    );
    const responseBody = await response.json();
    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: product.id
      }
    });
    const inventoryMovement = await prisma.inventoryMovement.findFirstOrThrow({
      where: {
        reason: `SALE:${responseBody.data.id}`,
        productId: product.id
      }
    });
    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: {
        source: "SALE",
        referenceId: responseBody.data.id
      }
    });

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({
      paymentType: "CASH",
      customerId: null,
      debtId: null,
      totalAmount: "25",
      items: [
        expect.objectContaining({
          productId: product.id,
          quantity: 2,
          unitPrice: "12.5",
          total: "25"
        })
      ]
    });
    expect(updatedProduct.stock).toBe(3);
    expect(inventoryMovement).toMatchObject({
      productId: product.id,
      previousStock: 5,
      newStock: 3,
      quantityChange: -2
    });
    expect(cashMovement.amount.toString()).toBe("25");
    expect(cashMovement).toMatchObject({
      type: "IN",
      source: "SALE",
      referenceId: responseBody.data.id
    });
  });

  it("creates a credit sale with debt through the API flow", async () => {
    const product = await createIntegrationProduct("CREDIT", 14, 6);
    const customer = await createIntegrationCustomer();

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          paymentType: "CREDIT",
          customerId: customer.id,
          items: [
            {
              productId: product.id,
              quantity: 2
            }
          ]
        })
      })
    );
    const responseBody = await response.json();
    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: {
        id: product.id
      }
    });
    const debt = await prisma.debt.findFirstOrThrow({
      where: {
        customerId: customer.id,
        totalAmount: responseBody.data.totalAmount
      }
    });
    const cashMovement = await prisma.cashMovement.findFirst({
      where: {
        source: "SALE",
        referenceId: responseBody.data.id
      }
    });
    const inventoryMovement = await prisma.inventoryMovement.findFirstOrThrow({
      where: {
        reason: `SALE:${responseBody.data.id}`,
        productId: product.id
      }
    });

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({
      paymentType: "CREDIT",
      customerId: customer.id,
      debtId: debt.id,
      totalAmount: "28"
    });
    expect(updatedProduct.stock).toBe(4);
    expect(debt.remainingAmount.toString()).toBe("28");
    expect(cashMovement).toBeNull();
    expect(inventoryMovement).toMatchObject({
      previousStock: 6,
      newStock: 4,
      quantityChange: -2
    });
  });

  it("lists sales after creation", async () => {
    const product = await createIntegrationProduct("LIST", 9, 4);

    const createResponse = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              productId: product.id,
              quantity: 1
            }
          ]
        })
      })
    );
    const createdSale = await createResponse.json();

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdSale.data.id,
          totalAmount: "9"
        })
      ])
    );
  });
});

async function createIntegrationProduct(
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

async function createIntegrationCustomer() {
  return prisma.customer.create({
    data: {
      name: `${testCustomerNamePrefix}${Date.now()}`
    }
  });
}

async function deleteIntegrationSaleData() {
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
