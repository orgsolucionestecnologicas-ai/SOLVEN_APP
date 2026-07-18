vi.mock("@/lib/tenant", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn(), update: vi.fn() }
  }
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/tenant";
import { POST } from "./route";

const mockedGetSession = vi.mocked(getSession);
const mockedVerifyPassword = vi.mocked(verifyPassword);
const mockedHashPassword = vi.mocked(hashPassword);
const mockedFindFirst = vi.mocked(prisma.user.findFirst);
const mockedUpdate = vi.mocked(prisma.user.update);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

const session = {
  tenantId: "test-tenant-id",
  userId: "test-user-id",
  role: "OWNER" as const,
  subscriptionStatus: "ACTIVE" as const,
  trialEndsAt: null
};
const user = { id: "test-user-id", tenantId: "test-tenant-id", password: "hashed-current-password" };

describe("change-password API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no session", async () => {
    mockedGetSession.mockResolvedValueOnce(null);

    const response = await POST(
      makeRequest({ currentPassword: "old12345", newPassword: "new12345" })
    );

    expect(response.status).toBe(401);
    expect(mockedFindFirst).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when newPassword is shorter than 8 characters", async () => {
    mockedGetSession.mockResolvedValueOnce(session);

    const response = await POST(
      makeRequest({ currentPassword: "old12345", newPassword: "short" })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("La contraseña debe tener al menos 8 caracteres.");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("returns 401 when currentPassword does not match the user's real password", async () => {
    mockedGetSession.mockResolvedValueOnce(session);
    mockedFindFirst.mockResolvedValueOnce(user as never);
    mockedVerifyPassword.mockResolvedValueOnce(false);

    const response = await POST(
      makeRequest({ currentPassword: "wrong-password", newPassword: "new12345" })
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("La contraseña actual es incorrecta.");
    expect(mockedVerifyPassword).toHaveBeenCalledWith("wrong-password", user.password);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("hashes and persists the new password on success", async () => {
    mockedGetSession.mockResolvedValueOnce(session);
    mockedFindFirst.mockResolvedValueOnce(user as never);
    mockedVerifyPassword.mockResolvedValueOnce(true);
    mockedHashPassword.mockResolvedValueOnce("hashed-new-password");

    const response = await POST(
      makeRequest({ currentPassword: "old12345", newPassword: "new12345" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { id: session.userId, tenantId: session.tenantId }
    });
    expect(mockedHashPassword).toHaveBeenCalledWith("new12345");
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: user.id, tenantId: session.tenantId },
      data: { password: "hashed-new-password" }
    });
  });
});
