vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import { updateCustomer } from "../../../../modules/customers";
import { DELETE, PUT } from "./route";

vi.mock("../../../../modules/customers", () => ({
  updateCustomer: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findFirst: vi.fn(), delete: vi.fn() },
    debt: { findFirst: vi.fn() }
  }
}));

const mockedRequireRole = vi.mocked(requireRole);
const mockedUpdateCustomer = vi.mocked(updateCustomer);

describe("customers/[id] API route — role checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the role is not authorized to update a customer", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await PUT(
      new Request("http://localhost/api/customers/customer-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Nuevo nombre" })
      }),
      { params: Promise.resolve({ id: "customer-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mockedUpdateCustomer).not.toHaveBeenCalled();
  });

  it("returns 403 when the role is not authorized to delete a customer", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await DELETE(new Request("http://localhost/api/customers/customer-1"), {
      params: Promise.resolve({ id: "customer-1" })
    });

    expect(response.status).toBe(403);
  });
});
