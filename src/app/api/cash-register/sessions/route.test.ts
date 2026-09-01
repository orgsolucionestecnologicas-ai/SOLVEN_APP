vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { listClosedSessions } from "../../../../modules/cash-register";
import { GET } from "./route";

vi.mock("../../../../modules/cash-register", () => ({
  listClosedSessions: vi.fn()
}));

const mockedRequireRole = vi.mocked(requireRole);
const mockedListClosedSessions = vi.mocked(listClosedSessions);

describe("cash-register/sessions GET route — role checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the role is not authorized to list cash register sessions", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await GET(new Request("http://localhost/api/cash-register/sessions"));

    expect(response.status).toBe(403);
    expect(mockedListClosedSessions).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no valid session", async () => {
    mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

    const response = await GET(new Request("http://localhost/api/cash-register/sessions"));

    expect(response.status).toBe(401);
    expect(mockedListClosedSessions).not.toHaveBeenCalled();
  });

  it("returns the sessions when the role is authorized", async () => {
    mockedListClosedSessions.mockResolvedValueOnce({ data: [], total: 0 } as never);

    const response = await GET(new Request("http://localhost/api/cash-register/sessions"));

    expect(response.status).toBe(200);
    expect(mockedListClosedSessions).toHaveBeenCalledWith("test-tenant-id", { page: 1, limit: 20 });
  });
});
