vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: vi.fn() }
  }
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { GET } from "./route";

const mockedRequireTenantId = vi.mocked(requireTenantId);
const mockedFindUnique = vi.mocked(prisma.subscription.findUnique);

describe("GET /api/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireTenantId.mockResolvedValue("test-tenant-id");
  });

  it("propagates UnauthorizedError without a session (route does not catch it — see report)", async () => {
    mockedRequireTenantId.mockReset();
    mockedRequireTenantId.mockRejectedValueOnce(new UnauthorizedError());

    await expect(GET()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns TRIAL defaults when there is no Subscription row", async () => {
    mockedFindUnique.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { status: "TRIAL", trialEndsAt: null, daysLeft: null }
    });
  });

  it("calculates daysLeft rounded up for a future trialEndsAt", async () => {
    const trialEndsAt = new Date(Date.now() + 2.1 * 24 * 60 * 60 * 1000);
    mockedFindUnique.mockResolvedValueOnce({
      status: "TRIAL",
      trialEndsAt,
      currentPeriodEnd: null
    } as never);

    const response = await GET();
    const body = (await response.json()) as { data: { daysLeft: number } };

    expect(response.status).toBe(200);
    expect(body.data.daysLeft).toBe(3);
  });

  it("returns daysLeft: 0 when trialEndsAt is in the past", async () => {
    const trialEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockedFindUnique.mockResolvedValueOnce({
      status: "TRIAL",
      trialEndsAt,
      currentPeriodEnd: null
    } as never);

    const response = await GET();
    const body = (await response.json()) as { data: { daysLeft: number } };

    expect(response.status).toBe(200);
    expect(body.data.daysLeft).toBe(0);
  });

  it("returns an error when the subscription cannot be loaded", async () => {
    mockedFindUnique.mockRejectedValueOnce(new Error("DB error"));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
