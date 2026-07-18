vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("../../../modules/users", () => ({
  createUser: vi.fn(),
  listUsers: vi.fn(),
  UserValidationError: class UserValidationError extends Error {
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

import { logAudit } from "@/modules/audit";
import { createUser, listUsers, UserValidationError } from "../../../modules/users";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { GET, POST } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedCreateUser = vi.mocked(createUser);
const mockedListUsers = vi.mocked(listUsers);
const mockedLogAudit = vi.mocked(logAudit);

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/users", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("users API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 403 when the role is not OWNER or CASHIER", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await GET();

      expect(response.status).toBe(403);
      expect(mockedListUsers).not.toHaveBeenCalled();
    });

    it("returns the user list on success", async () => {
      mockedRequireRole.mockResolvedValueOnce({
        tenantId: "test-tenant-id",
        userId: "test-user-id",
        role: "OWNER"
      });
      mockedListUsers.mockResolvedValueOnce([{ id: "user-1" }] as never);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: [{ id: "user-1" }] });
    });
  });

  describe("POST", () => {
    it("returns 403 for CASHIER — only OWNER may create users", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await POST(
        makePostRequest({ name: "Nuevo", email: "n@ej.com", password: "password123", role: "CASHIER" })
      );

      expect(response.status).toBe(403);
      expect(mockedRequireRole).toHaveBeenCalledWith(["OWNER"]);
      expect(mockedCreateUser).not.toHaveBeenCalled();
    });

    it("returns 401 without a session", async () => {
      mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

      const response = await POST(
        makePostRequest({ name: "Nuevo", email: "n@ej.com", password: "password123", role: "CASHIER" })
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 with validation reasons on invalid input", async () => {
      mockedRequireRole.mockResolvedValueOnce({
        tenantId: "test-tenant-id",
        userId: "owner-1",
        role: "OWNER"
      });
      mockedCreateUser.mockRejectedValueOnce(
        new UserValidationError(["La contraseña debe tener al menos 8 caracteres."])
      );

      const response = await POST(
        makePostRequest({ name: "Nuevo", email: "n@ej.com", password: "short", role: "CASHIER" })
      );

      expect(response.status).toBe(400);
      expect(mockedLogAudit).not.toHaveBeenCalled();
    });

    it("creates the user, logs an audit entry, and returns 201 on success", async () => {
      mockedRequireRole.mockResolvedValueOnce({
        tenantId: "test-tenant-id",
        userId: "owner-1",
        role: "OWNER"
      });
      mockedCreateUser.mockResolvedValueOnce({
        id: "user-1",
        name: "Nuevo",
        role: "CASHIER",
        userCode: "NUE01"
      } as never);

      const response = await POST(
        makePostRequest({ name: "Nuevo", email: "n@ej.com", password: "password123", role: "CASHIER" })
      );

      expect(response.status).toBe(201);
      expect(mockedLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "test-tenant-id", action: "USER_CREATED", entityId: "user-1" })
      );
    });
  });
});
