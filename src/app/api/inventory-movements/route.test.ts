vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("../../../modules/inventory", () => ({
  listInventoryMovements: vi.fn()
}));

import { describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { listInventoryMovements } from "../../../modules/inventory";
import { GET } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedListInventoryMovements = vi.mocked(listInventoryMovements);

describe("inventory-movements GET route", () => {
  it("returns 403 when the role is not authorized", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockedListInventoryMovements).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no valid session", async () => {
    mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns the inventory movements for the tenant when authorized", async () => {
    mockedRequireRole.mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" });
    mockedListInventoryMovements.mockResolvedValue([{ id: "movement-1" }] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedListInventoryMovements).toHaveBeenCalledWith("test-tenant-id");
    expect(body.data).toEqual([{ id: "movement-1" }]);
  });
});
