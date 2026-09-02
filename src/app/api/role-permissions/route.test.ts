vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("@/modules/role-permissions", () => ({
  listRolePermissions: vi.fn(),
  upsertRolePermissions: vi.fn(),
  validateRolePermissionInputs: vi.fn(),
  RolePermissionValidationError: class RolePermissionValidationError extends Error {
    reasons: string[];
    constructor(reasons: string[]) {
      super(reasons.join(" "));
      this.reasons = reasons;
    }
  }
}));

vi.mock("@/modules/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined)
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import {
  listRolePermissions,
  upsertRolePermissions,
  validateRolePermissionInputs
} from "@/modules/role-permissions";
import { logAudit } from "@/modules/audit";
import { GET, PATCH } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedListRolePermissions = vi.mocked(listRolePermissions);
const mockedUpsertRolePermissions = vi.mocked(upsertRolePermissions);
const mockedValidateRolePermissionInputs = vi.mocked(validateRolePermissionInputs);
const mockedLogAudit = vi.mocked(logAudit);

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/role-permissions", {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

describe("role-permissions API route (USER-FIX-05, USER-FIX-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireRole.mockResolvedValue({
      tenantId: "test-tenant-id",
      userId: "owner-1",
      role: "OWNER"
    });
  });

  describe("GET", () => {
    it("returns 403 when the caller is not OWNER", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await GET();

      expect(response.status).toBe(403);
      expect(mockedListRolePermissions).not.toHaveBeenCalled();
    });

    it("returns the permission matrix for OWNER", async () => {
      mockedListRolePermissions.mockResolvedValueOnce([
        { role: "CASHIER", section: "pos", canAccess: true }
      ] as never);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(mockedRequireRole).toHaveBeenCalledWith(["OWNER"]);
      expect(await response.json()).toEqual({
        data: [{ role: "CASHIER", section: "pos", canAccess: true }]
      });
    });
  });

  describe("PATCH", () => {
    it("returns 403 when the caller is not OWNER", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await PATCH(patchRequest({ permissions: [] }));

      expect(response.status).toBe(403);
      expect(mockedUpsertRolePermissions).not.toHaveBeenCalled();
      expect(mockedLogAudit).not.toHaveBeenCalled();
    });

    it("updates permissions and logs ROLE_PERMISSIONS_UPDATED", async () => {
      const permissions = [{ role: "CASHIER", section: "pos", canAccess: false }];
      mockedValidateRolePermissionInputs.mockReturnValueOnce(permissions as never);
      mockedUpsertRolePermissions.mockResolvedValueOnce(permissions as never);

      const response = await PATCH(patchRequest({ permissions }));

      expect(response.status).toBe(200);
      expect(mockedUpsertRolePermissions).toHaveBeenCalledWith("test-tenant-id", permissions);
      expect(mockedLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "test-tenant-id",
          userId: "owner-1",
          action: "ROLE_PERMISSIONS_UPDATED",
          entityType: "RolePermission",
          metadata: { changes: permissions }
        })
      );
    });

    it("returns 400 when the body has no permissions array", async () => {
      const response = await PATCH(patchRequest({}));

      expect(response.status).toBe(400);
      expect(mockedUpsertRolePermissions).not.toHaveBeenCalled();
    });
  });
});
