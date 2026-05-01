import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { GET, POST } from "./route";

const testProductNamePrefix = "SOLVEN_INTEGRATION_PRODUCT_";

describe("products API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationProducts();
  });

  afterAll(async () => {
    await deleteIntegrationProducts();
    await prisma.$disconnect();
  });

  it("creates a product through the API flow", async () => {
    const productName = `${testProductNamePrefix}${Date.now()}`;

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: productName,
          costPrice: 12.5,
          salePrice: 18.75,
          stock: 7
        })
      })
    );

    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({
      name: productName,
      costPrice: "12.5",
      salePrice: "18.75",
      stock: 7
    });
  });

  it("lists products after creation", async () => {
    const productName = `${testProductNamePrefix}${Date.now()}`;

    await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: productName,
          costPrice: 4,
          salePrice: 6,
          stock: 3
        })
      })
    );

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: productName,
          costPrice: "4",
          salePrice: "6",
          stock: 3
        })
      ])
    );
  });
});

async function deleteIntegrationProducts() {
  await prisma.product.deleteMany({
    where: {
      name: {
        startsWith: testProductNamePrefix
      }
    }
  });
}
