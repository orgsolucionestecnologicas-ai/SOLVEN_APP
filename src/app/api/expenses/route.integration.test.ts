import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireRole, requireTenantId } from "@/lib/tenant";

import { GET, POST } from "./route";

vi.mock("@/lib/tenant", () => ({ requireTenantId: vi.fn(), requireRole: vi.fn() }));

const mockedRequireTenantId = vi.mocked(requireTenantId);
const mockedRequireRole = vi.mocked(requireRole);
const testExpenseDescriptionPrefix = "SOLVEN_INTEGRATION_EXPENSE_";
const testTenantEmail = "solven_integration_expense@test.internal";

let testTenantId: string;

describe("expenses API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationExpenses();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Expense API Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    mockedRequireTenantId.mockResolvedValue(testTenantId);
    mockedRequireRole.mockResolvedValue({ tenantId: testTenantId, userId: "test-user-id", role: "OWNER" });
  });

  afterAll(async () => {
    await deleteIntegrationExpenses();
    await prisma.$disconnect();
  });

  it("creates an expense through the API flow", async () => {
    const expenseDescription = `${testExpenseDescriptionPrefix}${Date.now()}`;

    const response = await POST(
      new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({ amount: 25.5, category: "Supplies", description: expenseDescription })
      })
    );

    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({ amount: "25.5", category: "Supplies", description: expenseDescription });

    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "EXPENSE", referenceId: responseBody.data.id }
    });

    expect(cashMovement.amount.toString()).toBe("25.5");
    expect(cashMovement).toMatchObject({ type: "OUT", source: "EXPENSE", referenceId: responseBody.data.id });
  });

  it("lists expenses after creation", async () => {
    const expenseDescription = `${testExpenseDescriptionPrefix}${Date.now()}`;

    await POST(
      new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({ amount: 18, category: "Transport", description: expenseDescription })
      })
    );

    const response = await GET(new Request("http://localhost/api/expenses"));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amount: "18", category: "Transport", description: expenseDescription })
      ])
    );
  });
});

async function deleteIntegrationExpenses() {
  const testExpenses = await prisma.expense.findMany({
    where: { description: { startsWith: testExpenseDescriptionPrefix } },
    select: { id: true }
  });
  const testExpenseIds = testExpenses.map((e) => e.id);

  await prisma.cashMovement.deleteMany({ where: { source: "EXPENSE", referenceId: { in: testExpenseIds } } });
  await prisma.expense.deleteMany({ where: { description: { startsWith: testExpenseDescriptionPrefix } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
