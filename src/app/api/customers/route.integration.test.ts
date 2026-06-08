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
const testCustomerNamePrefix = "SOLVEN_INTEGRATION_CUSTOMER_";
const testTenantEmail = "solven_integration_customer@test.internal";

let testTenantId: string;

describe("customers API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationCustomers();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Customer API Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    mockedRequireTenantId.mockResolvedValue(testTenantId);
    mockedRequireRole.mockResolvedValue({ tenantId: testTenantId, userId: "integration-user-id", role: "OWNER" });
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
        body: JSON.stringify({ name: customerName })
      })
    );

    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({ name: customerName });
  });

  it("lists customers after creation", async () => {
    const customerName = `${testCustomerNamePrefix}${Date.now()}`;

    await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: customerName })
      })
    );

    const response = await GET(new Request("http://localhost/api/customers"));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: customerName })])
    );
  });
});

async function deleteIntegrationCustomers() {
  await prisma.customer.deleteMany({ where: { name: { startsWith: testCustomerNamePrefix } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
