import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createDebt } from "../../../modules/debts";
import { GET, POST } from "./route";

const testCustomerNamePrefix = "SOLVEN_INTEGRATION_DEBT_PAYMENT_CUSTOMER_";

describe("debt payments API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationDebtPaymentData();
  });

  afterAll(async () => {
    await deleteIntegrationDebtPaymentData();
    await prisma.$disconnect();
  });

  it("registers a debt payment through the API flow", async () => {
    const debt = await createIntegrationDebt(100);

    const response = await POST(
      new Request("http://localhost/api/debt-payments", {
        method: "POST",
        body: JSON.stringify({
          debtId: debt.id,
          amount: 35.5
        })
      })
    );

    const responseBody = await response.json();
    const updatedDebt = await prisma.debt.findUniqueOrThrow({
      where: {
        id: debt.id
      }
    });

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({
      debtId: debt.id,
      amount: "35.5"
    });
    expect(updatedDebt.remainingAmount.toString()).toBe("64.5");
  });

  it("lists debt payments after registration", async () => {
    const debt = await createIntegrationDebt(80);

    await POST(
      new Request("http://localhost/api/debt-payments", {
        method: "POST",
        body: JSON.stringify({
          debtId: debt.id,
          amount: 20
        })
      })
    );

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          debtId: debt.id,
          amount: "20"
        })
      ])
    );
  });

  it("rejects a payment that exceeds the remaining debt amount", async () => {
    const debt = await createIntegrationDebt(25);

    const response = await POST(
      new Request("http://localhost/api/debt-payments", {
        method: "POST",
        body: JSON.stringify({
          debtId: debt.id,
          amount: 26
        })
      })
    );

    const updatedDebt = await prisma.debt.findUniqueOrThrow({
      where: {
        id: debt.id
      }
    });
    const payments = await prisma.debtPayment.findMany({
      where: {
        debtId: debt.id
      }
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Debt payment amount cannot exceed remaining debt amount."
      }
    });
    expect(updatedDebt.remainingAmount.toString()).toBe("25");
    expect(payments).toHaveLength(0);
  });
});

async function createIntegrationDebt(totalAmount: number) {
  const customer = await prisma.customer.create({
    data: {
      name: `${testCustomerNamePrefix}${Date.now()}`
    }
  });

  return createDebt({
    customerId: customer.id,
    totalAmount
  });
}

async function deleteIntegrationDebtPaymentData() {
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
  await prisma.customer.deleteMany({
    where: {
      id: {
        in: testCustomerIds
      }
    }
  });
}
