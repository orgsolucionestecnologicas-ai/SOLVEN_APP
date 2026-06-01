import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant";

import { GET, POST } from "./route";

vi.mock("@/lib/tenant", () => ({ requireTenantId: vi.fn() }));

const mockedRequireTenantId = vi.mocked(requireTenantId);
const testReferenceIdPrefix = "SOLVEN_INTEGRATION_CASH_MOVEMENT_";
const testTenantEmail = "solven_integration_cash@test.internal";

let testTenantId: string;

describe("cash movements API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationCashMovements();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Cash Movement API Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    mockedRequireTenantId.mockResolvedValue(testTenantId);
  });

  afterAll(async () => {
    await deleteIntegrationCashMovements();
    await prisma.$disconnect();
  });

  it("creates a cash movement through the API flow", async () => {
    const referenceId = `${testReferenceIdPrefix}${Date.now()}`;

    const response = await POST(
      new Request("http://localhost/api/cash-movements", {
        method: "POST",
        body: JSON.stringify({ type: "IN", amount: 40.5, source: "Manual", referenceId })
      })
    );

    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({ type: "IN", amount: "40.5", source: "Manual", referenceId });
  });

  it("lists cash movements after creation", async () => {
    const referenceId = `${testReferenceIdPrefix}${Date.now()}`;

    await POST(
      new Request("http://localhost/api/cash-movements", {
        method: "POST",
        body: JSON.stringify({ type: "OUT", amount: 12, source: "Manual", referenceId })
      })
    );

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "OUT", amount: "12", source: "Manual", referenceId })
      ])
    );
  });
});

async function deleteIntegrationCashMovements() {
  await prisma.cashMovement.deleteMany({ where: { referenceId: { startsWith: testReferenceIdPrefix } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
