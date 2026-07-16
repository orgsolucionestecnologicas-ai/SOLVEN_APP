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

import { verifySession } from "@/lib/auth";
import { listRolePermissions } from "@/modules/role-permissions";
import { ForbiddenError, requireRole, UnauthorizedError } from "./tenant";

const mockedVerifySession = vi.mocked(verifySession);
const mockedListRolePermissions = vi.mocked(listRolePermissions);

function mockSession(role: string, tenantId = "tenant-1", userId = "user-1") {
  mockGet.mockReturnValue({ value: "fake-token" });
  mockedVerifySession.mockResolvedValue({
    userId,
    tenantId,
    subscriptionStatus: "ACTIVE",
    trialEndsAt: null,
    role
  });
}

describe("requireRole — RolePermission enforcement (QA-FIX-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never blocks OWNER, even when a matching RolePermission row explicitly sets canAccess: false", async () => {
    mockSession("OWNER");
    mockedListRolePermissions.mockResolvedValue([
      { role: "OWNER", section: "pos", canAccess: false }
    ]);

    const result = await requireRole(["OWNER", "CASHIER"], "pos");

    expect(result).toEqual({ tenantId: "tenant-1", userId: "user-1", role: "OWNER" });
  });

  it("throws ForbiddenError for a non-OWNER role when RolePermission sets canAccess: false for that role/section", async () => {
    mockSession("CASHIER");
    mockedListRolePermissions.mockResolvedValue([
      { role: "CASHIER", section: "pos", canAccess: false }
    ]);

    await expect(requireRole(["OWNER", "CASHIER"], "pos")).rejects.toThrow(ForbiddenError);
  });

  it("behaves permissively (no restriction) when no RolePermission row exists for the role/section", async () => {
    mockSession("CASHIER");
    mockedListRolePermissions.mockResolvedValue([]);

    const result = await requireRole(["OWNER", "CASHIER"], "pos");

    expect(result).toEqual({ tenantId: "tenant-1", userId: "user-1", role: "CASHIER" });
  });

  it("behaves permissively when the matching row has canAccess: true", async () => {
    mockSession("CASHIER");
    mockedListRolePermissions.mockResolvedValue([
      { role: "CASHIER", section: "pos", canAccess: true }
    ]);

    const result = await requireRole(["OWNER", "CASHIER"], "pos");

    expect(result).toEqual({ tenantId: "tenant-1", userId: "user-1", role: "CASHIER" });
  });

  it("does not consult RolePermission at all when no section is passed (unchanged legacy behavior)", async () => {
    mockSession("CASHIER");

    const result = await requireRole(["OWNER", "CASHIER"]);

    expect(result).toEqual({ tenantId: "tenant-1", userId: "user-1", role: "CASHIER" });
    expect(mockedListRolePermissions).not.toHaveBeenCalled();
  });

  it("still rejects a role outside the hardcoded allowedRoles array even if RolePermission would allow it", async () => {
    mockSession("READONLY");
    mockedListRolePermissions.mockResolvedValue([
      { role: "READONLY", section: "pos", canAccess: true }
    ]);

    await expect(requireRole(["OWNER", "CASHIER"], "pos")).rejects.toThrow(ForbiddenError);
    expect(mockedListRolePermissions).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedError when there is no session, regardless of section", async () => {
    mockGet.mockReturnValue(undefined);

    await expect(requireRole(["OWNER"], "pos")).rejects.toThrow(UnauthorizedError);
  });
});
