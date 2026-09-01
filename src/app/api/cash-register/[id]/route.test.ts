vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("@/modules/audit", () => ({
  logAudit: vi.fn()
}));

vi.mock("@/lib/email-alerts", () => ({
  notifyCashDifferenceIfEnabled: vi.fn()
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { getSessionById } from "../../../../modules/cash-register";
import { GET } from "./route";

vi.mock("../../../../modules/cash-register", () => ({
  CashRegisterAlreadyClosedError: class CashRegisterAlreadyClosedError extends Error {},
  CashRegisterSessionNotFoundError: class CashRegisterSessionNotFoundError extends Error {},
  CashRegisterValidationError: class CashRegisterValidationError extends Error {
    reasons: string[];
    constructor(reasons: string[]) {
      super("Invalid cash register input.");
      this.reasons = reasons;
    }
  },
  closeSession: vi.fn(),
  getSessionById: vi.fn()
}));

const mockedRequireRole = vi.mocked(requireRole);
const mockedGetSessionById = vi.mocked(getSessionById);

describe("cash-register/[id] GET route — role checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the role is not authorized to view a cash register session", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await GET(new Request("http://localhost/api/cash-register/session-1"), {
      params: Promise.resolve({ id: "session-1" })
    });

    expect(response.status).toBe(403);
    expect(mockedGetSessionById).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no valid session", async () => {
    mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

    const response = await GET(new Request("http://localhost/api/cash-register/session-1"), {
      params: Promise.resolve({ id: "session-1" })
    });

    expect(response.status).toBe(401);
    expect(mockedGetSessionById).not.toHaveBeenCalled();
  });

  it("returns the session when the role is authorized", async () => {
    mockedGetSessionById.mockResolvedValueOnce({ id: "session-1" } as never);

    const response = await GET(new Request("http://localhost/api/cash-register/session-1"), {
      params: Promise.resolve({ id: "session-1" })
    });

    expect(response.status).toBe(200);
    expect(mockedGetSessionById).toHaveBeenCalledWith("session-1", "test-tenant-id");
  });
});
