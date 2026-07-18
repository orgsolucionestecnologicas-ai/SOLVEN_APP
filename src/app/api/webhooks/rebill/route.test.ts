vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendTrialEndingEmail: vi.fn().mockResolvedValue(undefined)
}));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendCancellationEmail,
  sendPaymentFailedEmail,
  sendTrialEndingEmail,
  sendWelcomeEmail
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const mockedFindUniqueTenant = vi.mocked(prisma.tenant.findUnique);
const mockedFindUniqueSub = vi.mocked(prisma.subscription.findUnique);
const mockedFindFirstSub = vi.mocked(prisma.subscription.findFirst);
const mockedUpdateSub = vi.mocked(prisma.subscription.update);
const mockedSendWelcomeEmail = vi.mocked(sendWelcomeEmail);
const mockedSendPaymentFailedEmail = vi.mocked(sendPaymentFailedEmail);
const mockedSendCancellationEmail = vi.mocked(sendCancellationEmail);
const mockedSendTrialEndingEmail = vi.mocked(sendTrialEndingEmail);

function makeRequest(body: string, signature?: string) {
  const headers: Record<string, string> = {};
  if (signature !== undefined) headers["x-rebill-signature"] = signature;
  return new Request("http://localhost/api/webhooks/rebill", {
    method: "POST",
    body,
    headers
  });
}

describe("POST /api/webhooks/rebill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for an invalid JSON body", async () => {
    const response = await POST(makeRequest("not-json"));

    expect(response.status).toBe(400);
  });

  it("documents current signature behavior: with REBILL_WEBHOOK_SECRET set, an invalid signature returns 401", async () => {
    vi.stubEnv("REBILL_WEBHOOK_SECRET", "test-secret");

    const response = await POST(
      makeRequest(JSON.stringify({ type: "subscription.activated", data: {} }), "00")
    );

    expect(response.status).toBe(401);
  });

  it("subscription.activated: updates the tenant's subscription to ACTIVE and sends the welcome email", async () => {
    mockedFindUniqueTenant.mockResolvedValueOnce({
      id: "tenant-1",
      email: "cliente@ejemplo.com",
      businessName: "Mi Comercio",
      subscription: { id: "sub-1" }
    } as never);

    const response = await POST(
      makeRequest(
        JSON.stringify({
          type: "subscription.activated",
          data: { id: "rebill-sub-1", customer: { email: "cliente@ejemplo.com" } }
        })
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mockedUpdateSub).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      data: { status: "ACTIVE", rebillSubscriptionId: "rebill-sub-1" }
    });
    expect(mockedSendWelcomeEmail).toHaveBeenCalledWith("cliente@ejemplo.com", "Mi Comercio");
  });

  it("subscription.created: behaves the same as subscription.activated", async () => {
    mockedFindUniqueTenant.mockResolvedValueOnce({
      id: "tenant-1",
      email: "cliente@ejemplo.com",
      businessName: "Mi Comercio",
      subscription: { id: "sub-1" }
    } as never);

    const response = await POST(
      makeRequest(
        JSON.stringify({
          type: "subscription.created",
          data: { id: "rebill-sub-1", customer: { email: "cliente@ejemplo.com" } }
        })
      )
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateSub).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      data: { status: "ACTIVE", rebillSubscriptionId: "rebill-sub-1" }
    });
    expect(mockedSendWelcomeEmail).toHaveBeenCalledWith("cliente@ejemplo.com", "Mi Comercio");
  });

  it("payment.success: sets the matched subscription to ACTIVE with the new currentPeriodEnd", async () => {
    mockedFindUniqueSub.mockResolvedValueOnce({ id: "sub-1" } as never);

    const response = await POST(
      makeRequest(
        JSON.stringify({
          type: "payment.success",
          data: { id: "rebill-sub-1", current_period_end: "2026-08-01T00:00:00.000Z" }
        })
      )
    );

    expect(response.status).toBe(200);
    expect(mockedFindUniqueSub).toHaveBeenCalledWith({ where: { rebillSubscriptionId: "rebill-sub-1" } });
    expect(mockedUpdateSub).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "ACTIVE", currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z") }
    });
  });

  it("invoice.paid: behaves the same as payment.success", async () => {
    mockedFindUniqueSub.mockResolvedValueOnce({ id: "sub-1" } as never);

    const response = await POST(
      makeRequest(JSON.stringify({ type: "invoice.paid", data: { id: "rebill-sub-1" } }))
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateSub).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "ACTIVE", currentPeriodEnd: undefined }
    });
  });

  it("payment.failed: sets the matched subscription to PAST_DUE and sends the payment-failed email", async () => {
    mockedFindFirstSub.mockResolvedValueOnce({
      id: "sub-1",
      tenant: { email: "cliente@ejemplo.com", businessName: "Mi Comercio" }
    } as never);

    const response = await POST(
      makeRequest(JSON.stringify({ type: "payment.failed", data: { id: "rebill-sub-1" } }))
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateSub).toHaveBeenCalledWith({ where: { id: "sub-1" }, data: { status: "PAST_DUE" } });
    expect(mockedSendPaymentFailedEmail).toHaveBeenCalledWith("cliente@ejemplo.com", "Mi Comercio");
  });

  it("invoice.payment_failed: behaves the same as payment.failed", async () => {
    mockedFindFirstSub.mockResolvedValueOnce({
      id: "sub-1",
      tenant: { email: "cliente@ejemplo.com", businessName: "Mi Comercio" }
    } as never);

    const response = await POST(
      makeRequest(JSON.stringify({ type: "invoice.payment_failed", data: { id: "rebill-sub-1" } }))
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateSub).toHaveBeenCalledWith({ where: { id: "sub-1" }, data: { status: "PAST_DUE" } });
    expect(mockedSendPaymentFailedEmail).toHaveBeenCalledWith("cliente@ejemplo.com", "Mi Comercio");
  });

  it("subscription.cancelled: sets the matched subscription to CANCELLED and sends the cancellation email", async () => {
    mockedFindFirstSub.mockResolvedValueOnce({
      id: "sub-1",
      tenant: { email: "cliente@ejemplo.com", businessName: "Mi Comercio" }
    } as never);

    const response = await POST(
      makeRequest(JSON.stringify({ type: "subscription.cancelled", data: { id: "rebill-sub-1" } }))
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateSub).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "CANCELLED", cancelledAt: expect.any(Date) }
    });
    expect(mockedSendCancellationEmail).toHaveBeenCalledWith("cliente@ejemplo.com", "Mi Comercio");
  });

  it("subscription.trial_will_end: sends the trial-ending email with the days remaining", async () => {
    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    mockedFindFirstSub.mockResolvedValueOnce({
      id: "sub-1",
      trialEndsAt,
      tenant: { email: "cliente@ejemplo.com", businessName: "Mi Comercio" }
    } as never);

    const response = await POST(
      makeRequest(JSON.stringify({ type: "subscription.trial_will_end", data: { id: "rebill-sub-1" } }))
    );

    expect(response.status).toBe(200);
    expect(mockedSendTrialEndingEmail).toHaveBeenCalledWith("cliente@ejemplo.com", "Mi Comercio", 3);
  });

  it("returns received:true even for an unrecognized event type", async () => {
    const response = await POST(makeRequest(JSON.stringify({ type: "unknown.event", data: {} })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mockedUpdateSub).not.toHaveBeenCalled();
  });
});
