import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  CashRegisterAlreadyClosedError,
  CashRegisterAlreadyOpenError,
  CashRegisterNoSessionOpenError,
  closeSession,
  openSession,
  requireOpenCashRegisterSession
} from "./cash-register-data-access";

const testCashierName = "SOLVEN_CASH_REGISTER_TEST_CASHIER";
const testTenantEmail = "solven_cash_register_test@test.internal";

let testTenantId: string;

describe("cash register data access", () => {
  beforeEach(async () => {
    await deleteCashRegisterTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Cash Register Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
  });

  afterAll(async () => {
    await deleteCashRegisterTestData();
    await prisma.$disconnect();
  });

  it("prevents two concurrent openSession calls from creating two OPEN sessions", async () => {
    const attempt = () =>
      openSession({ cashierName: testCashierName, branchName: "Main", openingAmount: 0 }, testTenantId);

    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(CashRegisterAlreadyOpenError);

    const openSessions = await prisma.cashRegisterSession.findMany({
      where: { tenantId: testTenantId, status: "OPEN" }
    });
    expect(openSessions).toHaveLength(1);
  });

  it("prevents two concurrent closeSession calls from closing the same session twice", async () => {
    const session = await openSession(
      { cashierName: testCashierName, branchName: "Main", openingAmount: 0 },
      testTenantId
    );

    const attempt = () => closeSession(session.id, { closingAmount: 0 }, testTenantId);

    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(CashRegisterAlreadyClosedError);

    const closedSession = await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(closedSession.status).toBe("CLOSED");
  });

  it("requireOpenCashRegisterSession throws when there is no open session", async () => {
    await expect(requireOpenCashRegisterSession(testTenantId)).rejects.toThrow(
      CashRegisterNoSessionOpenError
    );
  });

  it("requireOpenCashRegisterSession returns the open session when one exists", async () => {
    const session = await openSession(
      { cashierName: testCashierName, branchName: "Main", openingAmount: 0 },
      testTenantId
    );

    const found = await requireOpenCashRegisterSession(testTenantId);

    expect(found.id).toBe(session.id);
  });
});

async function deleteCashRegisterTestData() {
  const testTenants = await prisma.tenant.findMany({
    where: { email: testTenantEmail },
    select: { id: true }
  });
  const testTenantIds = testTenants.map((t) => t.id);
  await prisma.cashRegisterSession.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });
}
