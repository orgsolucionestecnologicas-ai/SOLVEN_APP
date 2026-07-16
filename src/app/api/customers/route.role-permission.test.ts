import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockGet })
}));

vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn()
}));

vi.mock("@/modules/role-permissions", () => ({
  listRolePermissions: vi.fn()
}));

vi.mock("../../../modules/customers", () => ({
  createCustomer: vi.fn(),
  listCustomers: vi.fn()
}));

import { verifySession } from "@/lib/auth";
import { listRolePermissions } from "@/modules/role-permissions";
import { createCustomer } from "../../../modules/customers";
import { POST } from "./route";

const mockedVerifySession = vi.mocked(verifySession);
const mockedListRolePermissions = vi.mocked(listRolePermissions);
const mockedCreateCustomer = vi.mocked(createCustomer);

function mockSession(role: string) {
  mockGet.mockReturnValue({ value: "fake-token" });
  mockedVerifySession.mockResolvedValue({
    userId: "user-1",
    tenantId: "tenant-1",
    subscriptionStatus: "ACTIVE",
    trialEndsAt: null,
    role
  });
}

function postRequest() {
  return new Request("http://localhost/api/customers", {
    method: "POST",
    body: JSON.stringify({ name: "Maria Lopez" })
  });
}

describe("POST /api/customers — real RolePermission enforcement (QA-FIX-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for a non-OWNER role when RolePermission blocks the 'customers' section", async () => {
    mockSession("CASHIER");
    mockedListRolePermissions.mockResolvedValue([
      { role: "CASHIER", section: "customers", canAccess: false }
    ]);

    const response = await POST(postRequest());

    expect(response.status).toBe(403);
    expect(mockedCreateCustomer).not.toHaveBeenCalled();
  });

  it("never blocks OWNER even when RolePermission has a canAccess: false row for OWNER/customers", async () => {
    mockSession("OWNER");
    mockedListRolePermissions.mockResolvedValue([
      { role: "OWNER", section: "customers", canAccess: false }
    ]);
    mockedCreateCustomer.mockResolvedValueOnce({ id: "customer-1" } as never);

    const response = await POST(postRequest());

    expect(response.status).toBe(201);
    expect(mockedCreateCustomer).toHaveBeenCalled();
  });
});
