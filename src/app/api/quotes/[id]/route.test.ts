vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("../../../../modules/quotes", () => ({
  cancelQuote: vi.fn(),
  getQuoteById: vi.fn(),
  QuoteAlreadyConfirmedError: class QuoteAlreadyConfirmedError extends Error {},
  QuoteNotFoundError: class QuoteNotFoundError extends Error {}
}));

vi.mock("@/modules/audit", () => ({
  logAudit: vi.fn()
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelQuote,
  getQuoteById,
  QuoteAlreadyConfirmedError,
  QuoteNotFoundError
} from "../../../../modules/quotes";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { DELETE, GET } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedGetQuoteById = vi.mocked(getQuoteById);
const mockedCancelQuote = vi.mocked(cancelQuote);

function makeRequest() {
  return new Request("http://localhost/api/quotes/quote-1");
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET/DELETE /api/quotes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireRole.mockResolvedValue({
      tenantId: "test-tenant-id",
      userId: "test-user-id",
      role: "OWNER"
    });
  });

  describe("GET", () => {
    it("returns 403 when the role is not authorized", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await GET(makeRequest(), makeParams("quote-1"));

      expect(response.status).toBe(403);
      expect(mockedGetQuoteById).not.toHaveBeenCalled();
    });

    it("returns 401 without a session", async () => {
      mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

      const response = await GET(makeRequest(), makeParams("quote-1"));

      expect(response.status).toBe(401);
    });

    it("returns 404 when the quote does not exist", async () => {
      mockedGetQuoteById.mockRejectedValueOnce(new QuoteNotFoundError());

      const response = await GET(makeRequest(), makeParams("quote-1"));

      expect(response.status).toBe(404);
    });

    it("returns the quote on success", async () => {
      mockedGetQuoteById.mockResolvedValueOnce({ id: "quote-1" } as never);

      const response = await GET(makeRequest(), makeParams("quote-1"));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { id: "quote-1" } });
      expect(mockedGetQuoteById).toHaveBeenCalledWith("quote-1", "test-tenant-id");
    });
  });

  describe("DELETE", () => {
    it("returns 403 when the role is not authorized", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await DELETE(makeRequest(), makeParams("quote-1"));

      expect(response.status).toBe(403);
      expect(mockedCancelQuote).not.toHaveBeenCalled();
    });

    it("returns 409 when the quote is already confirmed", async () => {
      mockedCancelQuote.mockRejectedValueOnce(new QuoteAlreadyConfirmedError());

      const response = await DELETE(makeRequest(), makeParams("quote-1"));

      expect(response.status).toBe(409);
    });

    it("cancels the quote on success", async () => {
      mockedCancelQuote.mockResolvedValueOnce({ id: "quote-1", quoteNumber: "COT-1" } as never);

      const response = await DELETE(makeRequest(), makeParams("quote-1"));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { id: "quote-1", quoteNumber: "COT-1" } });
      expect(mockedCancelQuote).toHaveBeenCalledWith("quote-1", "test-tenant-id");
    });
  });
});
