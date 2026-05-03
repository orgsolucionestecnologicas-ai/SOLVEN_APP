import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createDebt } from "./debt-data-access";
import {
  DebtPaymentAmountError,
  listDebtPayments,
  registerDebtPayment
} from "./debt-payment-data-access";

const testCustomerNamePrefix = "SOLVEN_DEBT_PAYMENT_TEST_CUSTOMER_";

describe("debt payment data access", () => {
  beforeEach(async () => {
    await deleteDebtPaymentTestData();
  });

  afterAll(async () => {
    await deleteDebtPaymentTestData();
    await prisma.$disconnect();
  });

  it("registers a debt payment and reduces remaining debt amount atomically", async () => {
    const debt = await createTestDebt(100);

    const payment = await registerDebtPayment({
      debtId: debt.id,
      amount: 30.25
    });

    const updatedDebt = await prisma.debt.findUniqueOrThrow({
      where: {
        id: debt.id
      }
    });

    expect(payment.debtId).toBe(debt.id);
    expect(payment.amount.toString()).toBe("30.25");
    expect(updatedDebt.remainingAmount.toString()).toBe("69.75");

    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: {
        source: "DEBT_PAYMENT",
        referenceId: payment.id
      }
    });

    expect(cashMovement.amount.toString()).toBe("30.25");
    expect(cashMovement).toMatchObject({
      type: "IN",
      source: "DEBT_PAYMENT",
      referenceId: payment.id
    });
  });

  it("rejects a payment that exceeds remaining debt amount", async () => {
    const debt = await createTestDebt(40);

    await expect(
      registerDebtPayment({
        debtId: debt.id,
        amount: 41
      })
    ).rejects.toThrow(DebtPaymentAmountError);

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
    const cashMovements = await prisma.cashMovement.findMany({
      where: {
        source: "DEBT_PAYMENT",
        referenceId: {
          in: payments.map((payment) => payment.id)
        }
      }
    });

    expect(updatedDebt.remainingAmount.toString()).toBe("40");
    expect(payments).toHaveLength(0);
    expect(cashMovements).toHaveLength(0);
  });

  it("prevents concurrent payments from overpaying a debt", async () => {
    const debt = await createTestDebt(100);

    const results = await Promise.allSettled([
      registerDebtPayment({
        debtId: debt.id,
        amount: 80
      }),
      registerDebtPayment({
        debtId: debt.id,
        amount: 80
      })
    ]);

    const fulfilledResults = results.filter(
      (result) => result.status === "fulfilled"
    );
    const rejectedResults = results.filter(
      (result) => result.status === "rejected"
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
    const cashMovements = await prisma.cashMovement.findMany({
      where: {
        source: "DEBT_PAYMENT",
        referenceId: {
          in: payments.map((payment) => payment.id)
        }
      }
    });

    expect(fulfilledResults).toHaveLength(1);
    expect(rejectedResults).toHaveLength(1);
    expect(rejectedResults[0].reason).toBeInstanceOf(
      DebtPaymentAmountError
    );
    expect(updatedDebt.remainingAmount.toString()).toBe("20");
    expect(payments).toHaveLength(1);
    expect(payments[0].amount.toString()).toBe("80");
    expect(cashMovements).toHaveLength(1);
    expect(cashMovements[0]).toMatchObject({
      type: "IN",
      source: "DEBT_PAYMENT",
      referenceId: payments[0].id
    });
  });

  it("lists debt payments after registration", async () => {
    const debt = await createTestDebt(80);
    const payment = await registerDebtPayment({
      debtId: debt.id,
      amount: 25
    });

    const payments = await listDebtPayments();

    expect(payments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: payment.id,
          debtId: debt.id
        })
      ])
    );
  });
});

async function createTestDebt(totalAmount: number) {
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

async function deleteDebtPaymentTestData() {
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
  const testPayments = await prisma.debtPayment.findMany({
    where: {
      debtId: {
        in: testDebtIds
      }
    },
    select: {
      id: true
    }
  });
  const testPaymentIds = testPayments.map((payment) => payment.id);

  await prisma.cashMovement.deleteMany({
    where: {
      source: "DEBT_PAYMENT",
      referenceId: {
        in: testPaymentIds
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
  await prisma.customer.deleteMany({
    where: {
      id: {
        in: testCustomerIds
      }
    }
  });
}
