vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import {
  createCashMovement,
  listCashMovements
} from "../../../modules/cash";
import { CashMovementValidationError } from "../../../modules/cash/cash-movement-validation";
import { GET, POST } from "./route";

vi.mock("../../../modules/cash", () => ({
  createCashMovement: vi.fn(),
  listCashMovements: vi.fn()
}));

const mockedCreateCashMovement = vi.mocked(createCashMovement);
const mockedListCashMovements = vi.mocked(listCashMovements);
const mockedRequireRole = vi.mocked(requireRole);

describe("cash movements API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists cash movements", async () => {
    const cashMovements = [buildCashMovementRecord()];
    mockedListCashMovements.mockResolvedValueOnce({ data: cashMovements, total: 1 } as never);

    const response = await GET(new Request("http://localhost/api/cash-movements"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ data: [cashMovementJson] }));
  });

  it("returns 403 when the role is not authorized to list cash movements", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await GET(new Request("http://localhost/api/cash-movements"));

    expect(response.status).toBe(403);
    expect(mockedListCashMovements).not.toHaveBeenCalled();
  });

  it("returns a server error when cash movements cannot be listed", async () => {
    mockedListCashMovements.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET(new Request("http://localhost/api/cash-movements"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "No se pudieron cargar los movimientos de caja."
      }
    });
  });

  it("creates a cash movement", async () => {
    const cashMovement = buildCashMovementRecord();
    mockedCreateCashMovement.mockResolvedValueOnce(cashMovement);

    const response = await POST(
      new Request("http://localhost/api/cash-movements", {
        method: "POST",
        body: JSON.stringify({
          type: "IN",
          amount: 30.5,
          source: "Manual",
          referenceId: "manual-1"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: cashMovementJson });
    expect(mockedCreateCashMovement).toHaveBeenCalledWith({
      type: "IN",
      amount: 30.5,
      source: "Manual",
      referenceId: "manual-1"
    }, "test-tenant-id");
  });

  it("returns validation errors for invalid cash movement input", async () => {
    mockedCreateCashMovement.mockRejectedValueOnce(
      new CashMovementValidationError([
        "Cash movement type must be IN or OUT."
      ])
    );

    const response = await POST(
      new Request("http://localhost/api/cash-movements", {
        method: "POST",
        body: JSON.stringify({
          type: "INVALID",
          amount: 30.5,
          source: "Manual",
          referenceId: "manual-1"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Invalid cash movement input.",
        details: ["Cash movement type must be IN or OUT."]
      }
    });
  });
});

const cashMovementJson = {
  id: "cash-movement-1",
  type: "IN",
  amount: "30.50",
  source: "Manual",
  referenceId: "manual-1",
  movementDate: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function buildCashMovementRecord(): Awaited<
  ReturnType<typeof createCashMovement>
> {
  return {
    ...cashMovementJson,
    movementDate: new Date(cashMovementJson.movementDate),
    createdAt: new Date(cashMovementJson.createdAt),
    updatedAt: new Date(cashMovementJson.updatedAt)
  } as unknown as Awaited<ReturnType<typeof createCashMovement>>;
}
