import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockFindUnique } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockFindUnique: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockGet })
}));

vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn()
}));

vi.mock("@/modules/role-permissions", () => ({
  listRolePermissions: vi.fn()
}));

vi.mock("./prisma", () => ({
  prisma: { user: { findUnique: mockFindUnique } }
}));

import { verifySession } from "@/lib/auth";
import { listRolePermissions } from "@/modules/role-permissions";
import {
  __resetSessionRevalidationCacheForTests,
  ForbiddenError,
  requireRole,
  UnauthorizedError
} from "./tenant";

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
  mockFindUnique.mockResolvedValue({ active: true, role, tenantId });
}

describe("requireRole — RolePermission enforcement (QA-FIX-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSessionRevalidationCacheForTests();
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

describe("requireRole — session revalidation against the database (USER-FIX-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSessionRevalidationCacheForTests();
  });

  it("throws UnauthorizedError when the user was deactivated after the session was issued", async () => {
    mockSession("OWNER");
    mockFindUnique.mockResolvedValue({ active: false, role: "OWNER", tenantId: "tenant-1" });

    await expect(requireRole(["OWNER"])).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when the user's role in the database no longer matches the session", async () => {
    mockSession("OWNER");
    mockFindUnique.mockResolvedValue({ active: true, role: "CASHIER", tenantId: "tenant-1" });

    await expect(requireRole(["OWNER"])).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when the user record no longer exists", async () => {
    mockSession("OWNER");
    mockFindUnique.mockResolvedValue(null);

    await expect(requireRole(["OWNER"])).rejects.toThrow(UnauthorizedError);
  });

  it("does not re-hit the database on a second call within the TTL window", async () => {
    mockSession("OWNER");

    await requireRole(["OWNER"]);
    await requireRole(["OWNER"]);

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });
});
