vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("../../../../modules/users", () => ({
  deleteUser: vi.fn(),
  setUserActive: vi.fn(),
  updateUserAvatar: vi.fn(),
  updateUserPin: vi.fn(),
  updateUserRole: vi.fn(),
  UserValidationError: class UserValidationError extends Error {
    reasons: string[];
    constructor(reasons: string[]) {
      super(reasons.join(" "));
      this.reasons = reasons;
    }
  }
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteUser,
  setUserActive,
  updateUserRole,
  UserValidationError
} from "../../../../modules/users";
import { ForbiddenError, requireRole } from "@/lib/tenant";
import { DELETE, PATCH } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedSetUserActive = vi.mocked(setUserActive);
const mockedUpdateUserRole = vi.mocked(updateUserRole);
const mockedDeleteUser = vi.mocked(deleteUser);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/users/user-1", {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

function makeDeleteRequest(query = "") {
  return new Request(`http://localhost/api/users/user-1${query}`);
}

describe("users/[id] API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireRole.mockResolvedValue({
      tenantId: "test-tenant-id",
      userId: "owner-1",
      role: "OWNER"
    });
  });

  describe("PATCH", () => {
    it("returns 403 when the role is not OWNER", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await PATCH(makePatchRequest({ active: false }), makeParams("user-1"));

      expect(response.status).toBe(403);
    });

    it("calls setUserActive when active is provided", async () => {
      mockedSetUserActive.mockResolvedValueOnce({ id: "user-1", active: false } as never);

      const response = await PATCH(makePatchRequest({ active: false }), makeParams("user-1"));

      expect(response.status).toBe(200);
      expect(mockedSetUserActive).toHaveBeenCalledWith("user-1", false, "test-tenant-id", "owner-1");
    });

    it("calls updateUserRole when role is provided", async () => {
      mockedUpdateUserRole.mockResolvedValueOnce({ id: "user-1", role: "SUPERVISOR" } as never);

      const response = await PATCH(makePatchRequest({ role: "SUPERVISOR" }), makeParams("user-1"));

      expect(response.status).toBe(200);
      expect(mockedUpdateUserRole).toHaveBeenCalledWith(
        "user-1",
        { role: "SUPERVISOR" },
        "test-tenant-id",
        "owner-1"
      );
    });

    it("returns 400 when a user tries to change their own role", async () => {
      mockedRequireRole.mockResolvedValueOnce({
        tenantId: "test-tenant-id",
        userId: "user-1",
        role: "OWNER"
      });
      mockedUpdateUserRole.mockRejectedValueOnce(
        new UserValidationError(["No podés cambiar tu propio rol."])
      );

      const response = await PATCH(makePatchRequest({ role: "CASHIER" }), makeParams("user-1"));

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { message: string } };
      expect(body.error.message).toBe("No podés cambiar tu propio rol.");
    });

    it("returns 400 when a user tries to deactivate themselves", async () => {
      mockedRequireRole.mockResolvedValueOnce({
        tenantId: "test-tenant-id",
        userId: "user-1",
        role: "OWNER"
      });
      mockedSetUserActive.mockRejectedValueOnce(
        new UserValidationError(["No podés desactivarte a vos mismo."])
      );

      const response = await PATCH(makePatchRequest({ active: false }), makeParams("user-1"));

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { message: string } };
      expect(body.error.message).toBe("No podés desactivarte a vos mismo.");
    });
  });

  describe("DELETE", () => {
    it("returns 403 when the role is not OWNER", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await DELETE(makeDeleteRequest(), makeParams("user-1"));

      expect(response.status).toBe(403);
    });

    it("returns deleted:false with salesCount when the user has associated sales and confirm is not set", async () => {
      mockedDeleteUser.mockResolvedValueOnce({ deleted: false, salesCount: 3 });

      const response = await DELETE(makeDeleteRequest(), makeParams("user-1"));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { deleted: false, salesCount: 3 } });
      expect(mockedDeleteUser).toHaveBeenCalledWith("user-1", "test-tenant-id", "owner-1", false);
    });

    it("deletes for real when confirm=true is passed", async () => {
      mockedDeleteUser.mockResolvedValueOnce({ deleted: true, salesCount: 3 });

      const response = await DELETE(makeDeleteRequest("?confirm=true"), makeParams("user-1"));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { deleted: true, salesCount: 3 } });
      expect(mockedDeleteUser).toHaveBeenCalledWith("user-1", "test-tenant-id", "owner-1", true);
    });
  });
});
