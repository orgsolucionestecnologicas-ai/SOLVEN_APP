vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import { createDebt, type DebtWithCustomer, listDebts } from "../../../modules/debts";
import { DebtValidationError } from "../../../modules/debts/debt-validation";
import { GET, POST } from "./route";

const mockedRequireRole = vi.mocked(requireRole);

vi.mock("../../../modules/debts", () => ({
  createDebt: vi.fn(),
  listDebts: vi.fn()
}));

const mockedCreateDebt = vi.mocked(createDebt);
const mockedListDebts = vi.mocked(listDebts);

describe("debts API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists debts", async () => {
    const debts = [buildDebtRecord()];
    mockedListDebts.mockResolvedValueOnce({ data: debts, total: 1 } as never);

    const response = await GET(new Request("http://localhost/api/debts"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ data: [debtJson] }));
  });

  it("returns a server error when debts cannot be listed", async () => {
    mockedListDebts.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET(new Request("http://localhost/api/debts"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "No se pudieron cargar las deudas."
      }
    });
  });

  it("creates a debt", async () => {
    const debt = buildDebtRecord();
    mockedCreateDebt.mockResolvedValueOnce(debt);

    const response = await POST(
      new Request("http://localhost/api/debts", {
        method: "POST",
        body: JSON.stringify({
          customerId: "customer-1",
          totalAmount: 90
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: debtJson });
    expect(mockedCreateDebt).toHaveBeenCalledWith({
      customerId: "customer-1",
      totalAmount: 90
    }, "test-tenant-id");
  });

  it("returns validation errors for invalid debt input", async () => {
    mockedCreateDebt.mockRejectedValueOnce(
      new DebtValidationError(["Debt total amount must be a positive number."])
    );

    const response = await POST(
      new Request("http://localhost/api/debts", {
        method: "POST",
        body: JSON.stringify({
          customerId: "customer-1",
          totalAmount: 0
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Invalid debt input.",
        details: ["Debt total amount must be a positive number."]
      }
    });
  });

  it("returns an error when the customer does not exist", async () => {
    mockedCreateDebt.mockRejectedValueOnce(buildPrismaNotFoundError());

    const response = await POST(
      new Request("http://localhost/api/debts", {
        method: "POST",
        body: JSON.stringify({
          customerId: "missing-customer",
          totalAmount: 90
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Customer was not found."
      }
    });
  });

  it("returns 403 when the role is not authorized to create debts", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await POST(
      new Request("http://localhost/api/debts", {
        method: "POST",
        body: JSON.stringify({
          customerId: "customer-1",
          totalAmount: 90
        })
      })
    );

    expect(response.status).toBe(403);
    expect(mockedCreateDebt).not.toHaveBeenCalled();
  });
});

const debtJson = {
  id: "debt-1",
  customerId: "customer-1",
  totalAmount: "90.00",
  remainingAmount: "90.00",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  customer: { name: "Test Customer" }
};

function buildDebtRecord(): DebtWithCustomer {
  return {
    ...debtJson,
    createdAt: new Date(debtJson.createdAt),
    updatedAt: new Date(debtJson.updatedAt)
  } as unknown as DebtWithCustomer;
}

function buildPrismaNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "test"
  });
}
