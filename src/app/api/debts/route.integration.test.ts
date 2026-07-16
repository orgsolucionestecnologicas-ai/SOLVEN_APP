import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireRole, requireTenantId } from "@/lib/tenant";

import { GET, POST } from "./route";

vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(),
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

const mockedRequireTenantId = vi.mocked(requireTenantId);
const mockedRequireRole = vi.mocked(requireRole);
const testCustomerNamePrefix = "SOLVEN_INTEGRATION_DEBT_CUSTOMER_";
const testTenantEmail = "solven_integration_debt@test.internal";

let testTenantId: string;

describe("debts API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationDebtData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Debt API Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    mockedRequireTenantId.mockResolvedValue(testTenantId);
    mockedRequireRole.mockResolvedValue({ tenantId: testTenantId, userId: "integration-user-id", role: "OWNER" });
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
        body: JSON.stringify({ customerId: customer.id, totalAmount: 75.5 })
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
        body: JSON.stringify({ customerId: customer.id, totalAmount: 44 })
      })
    );

    const response = await GET(new Request("http://localhost/api/debts"));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ customerId: customer.id, totalAmount: "44", remainingAmount: "44" })
      ])
    );
  });
});

async function createIntegrationCustomer() {
  return prisma.customer.create({
    data: { tenantId: testTenantId, name: `${testCustomerNamePrefix}${Date.now()}` }
  });
}

async function deleteIntegrationDebtData() {
  const testCustomers = await prisma.customer.findMany({
    where: { name: { startsWith: testCustomerNamePrefix } },
    select: { id: true }
  });
  const testCustomerIds = testCustomers.map((c) => c.id);

  await prisma.debt.deleteMany({ where: { customerId: { in: testCustomerIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
