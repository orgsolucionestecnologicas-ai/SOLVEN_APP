import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { GET, POST } from "./route";

const testCustomerNamePrefix = "SOLVEN_INTEGRATION_DEBT_CUSTOMER_";

describe("debts API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationDebtData();
  });

  afterAll(async () => {
    await deleteIntegrationDebtData();
    await prisma.$disconnect();
  });

  it("creates a debt through the API flow", async () => {
    const customer = await createIntegrationCustomer();

    const response = await POST(
      new Request("http://localhost/api/debts", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          totalAmount: 75.5
        })
      })
    );

    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({
      customerId: customer.id,
      totalAmount: "75.5",
      remainingAmount: "75.5"
    });
  });

  it("lists debts after creation", async () => {
    const customer = await createIntegrationCustomer();

    await POST(
      new Request("http://localhost/api/debts", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          totalAmount: 44
        })
      })
    );

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          customerId: customer.id,
          totalAmount: "44",
          remainingAmount: "44"
        })
      ])
    );
  });
});

async function createIntegrationCustomer() {
  return prisma.customer.create({
    data: {
      name: `${testCustomerNamePrefix}${Date.now()}`
    }
  });
}

async function deleteIntegrationDebtData() {
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

  await prisma.debt.deleteMany({
    where: {
      customerId: {
        in: testCustomerIds
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
}
