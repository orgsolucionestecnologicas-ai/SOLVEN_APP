import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { GET, POST } from "./route";

const testProductNamePrefix = "SOLVEN_INTEGRATION_SALE_PRODUCT_";

describe("sales API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationSaleData();
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
}
