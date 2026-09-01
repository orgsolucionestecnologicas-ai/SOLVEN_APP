vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("../../../../../modules/quotes", () => ({
  duplicateQuote: vi.fn(),
  QuoteNotFoundError: class QuoteNotFoundError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { duplicateQuote, QuoteNotFoundError } from "../../../../../modules/quotes";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { POST } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedDuplicateQuote = vi.mocked(duplicateQuote);

function makeRequest() {
  return new Request("http://localhost/api/quotes/quote-1/duplicate", { method: "POST" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/quotes/[id]/duplicate", () => {
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
    expect(mockedDuplicateQuote).not.toHaveBeenCalled();
  });

  it("returns 401 without a session", async () => {
    mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when the quote does not exist", async () => {
    mockedDuplicateQuote.mockRejectedValueOnce(new QuoteNotFoundError());

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(404);
  });

  it("duplicates the quote using the authenticated user as seller", async () => {
    mockedDuplicateQuote.mockResolvedValueOnce({ id: "quote-2" } as never);

    const response = await POST(makeRequest(), makeParams("quote-1"));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "quote-2" } });
    expect(mockedDuplicateQuote).toHaveBeenCalledWith("quote-1", "test-tenant-id", "test-user-id");
  });
});
