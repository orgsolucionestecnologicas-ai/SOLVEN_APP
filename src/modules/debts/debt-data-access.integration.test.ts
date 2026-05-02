import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createDebt, listDebts } from "./debt-data-access";

const testCustomerNamePrefix = "SOLVEN_DEBT_TEST_CUSTOMER_";

describe("debt data access", () => {
  beforeEach(async () => {
    await deleteDebtTestData();
  });

  afterAll(async () => {
    await deleteDebtTestData();
    await prisma.$disconnect();
  });

  it("creates a debt connected to an existing customer", async () => {
    const customer = await createTestCustomer();

    const debt = await createDebt({
      customerId: customer.id,
      totalAmount: 85.75
    });

    const storedDebt = await prisma.debt.findUniqueOrThrow({
      where: {
        id: debt.id
      }
    });

    expect(storedDebt.customerId).toBe(customer.id);
    expect(storedDebt.totalAmount.toString()).toBe("85.75");
    expect(storedDebt.remainingAmount.toString()).toBe("85.75");
  });

  it("lists debts after creation", async () => {
    const customer = await createTestCustomer();
    const debt = await createDebt({
      customerId: customer.id,
      totalAmount: 42
    });

    const debts = await listDebts();

    expect(debts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: debt.id,
          customerId: customer.id
        })
      ])
    );
  });
});

async function createTestCustomer() {
  return prisma.customer.create({
    data: {
      name: `${testCustomerNamePrefix}${Date.now()}`
    }
  });
}

async function deleteDebtTestData() {
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
