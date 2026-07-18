vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("../../../../../modules/quotes", () => ({
  confirmQuote: vi.fn(),
  QuoteNotFoundError: class QuoteNotFoundError extends Error {},
  QuoteAlreadyConfirmedError: class QuoteAlreadyConfirmedError extends Error {},
  QuoteExpiredError: class QuoteExpiredError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmQuote,
  QuoteAlreadyConfirmedError,
  QuoteExpiredError,
  QuoteNotFoundError
} from "../../../../../modules/quotes";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { POST } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedConfirmQuote = vi.mocked(confirmQuote);

function makeRequest() {
  return new Request("http://localhost/api/quotes/quote-1/confirm", {
    method: "POST",
    body: JSON.stringify({})
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/quotes/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireRole.mockResolvedValue({
      tenantId: "test-tenant-id",
      userId: "test-user-id",
      role: "OWNER"
    });
  });

  it("returns 403 when the role is not authorized", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(403);
    expect(mockedConfirmQuote).not.toHaveBeenCalled();
  });

  it("returns 401 without a session", async () => {
    mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when the quote does not exist", async () => {
    mockedConfirmQuote.mockRejectedValueOnce(new QuoteNotFoundError());

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(404);
  });

  it("returns 409 when the quote is already confirmed", async () => {
    mockedConfirmQuote.mockRejectedValueOnce(new QuoteAlreadyConfirmedError());

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(409);
  });

  it("returns 409 when the quote has expired", async () => {
    mockedConfirmQuote.mockRejectedValueOnce(new QuoteExpiredError());

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(409);
  });

  it("confirms the quote and returns the resulting sale on the happy path", async () => {
    const sale = { id: "sale-1", totalAmount: 500 };
    mockedConfirmQuote.mockResolvedValueOnce(sale as never);

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: sale });
    expect(mockedConfirmQuote).toHaveBeenCalledWith("quote-1", "test-tenant-id");
  });
});
