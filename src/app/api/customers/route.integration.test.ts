import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { GET, POST } from "./route";

const testCustomerNamePrefix = "SOLVEN_INTEGRATION_CUSTOMER_";

describe("customers API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationCustomers();
  });

  afterAll(async () => {
    await deleteIntegrationCustomers();
    await prisma.$disconnect();
  });

  it("creates a customer through the API flow", async () => {
    const customerName = `${testCustomerNamePrefix}${Date.now()}`;

    const response = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: customerName
        })
      })
    );

    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({
      name: customerName
    });
  });

  it("lists customers after creation", async () => {
    const customerName = `${testCustomerNamePrefix}${Date.now()}`;

    await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: customerName
        })
      })
    );

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: customerName
        })
      ])
    );
  });
});

async function deleteIntegrationCustomers() {
  await prisma.customer.deleteMany({
    where: {
      name: {
        startsWith: testCustomerNamePrefix
      }
    }
  });
}
