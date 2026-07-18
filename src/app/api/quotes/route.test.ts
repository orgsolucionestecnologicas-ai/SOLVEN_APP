vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(),
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("../../../modules/quotes", () => ({
  createQuote: vi.fn(),
  listQuotes: vi.fn(),
  QuoteValidationError: class QuoteValidationError extends Error {
    reasons: string[];
    constructor(reasons: string[]) {
      super(reasons.join(" "));
      this.reasons = reasons;
    }
  }
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQuote, listQuotes, QuoteValidationError } from "../../../modules/quotes";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { GET, POST } from "./route";

const mockedRequireTenantId = vi.mocked(requireTenantId);
const mockedRequireRole = vi.mocked(requireRole);
const mockedCreateQuote = vi.mocked(createQuote);
const mockedListQuotes = vi.mocked(listQuotes);

function makeGetRequest(query = "") {
  return new Request(`http://localhost/api/quotes${query}`);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/quotes", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("quotes API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 without a session", async () => {
      mockedRequireTenantId.mockRejectedValueOnce(new UnauthorizedError());

      const response = await GET(makeGetRequest());

      expect(response.status).toBe(401);
      expect(mockedListQuotes).not.toHaveBeenCalled();
    });

    it("returns paginated quotes on success", async () => {
      mockedRequireTenantId.mockResolvedValueOnce("test-tenant-id");
      mockedListQuotes.mockResolvedValueOnce({ data: [{ id: "quote-1" }], total: 1 } as never);

      const response = await GET(makeGetRequest());

      expect(response.status).toBe(200);
      const body = (await response.json()) as { data: unknown[] };
      expect(body.data).toEqual([{ id: "quote-1" }]);
      expect(mockedListQuotes).toHaveBeenCalledWith(
        "test-tenant-id",
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });
  });

  describe("POST", () => {
    it("returns 403 when the role is not authorized", async () => {
      mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

      const response = await POST(makePostRequest({ items: [] }));

      expect(response.status).toBe(403);
      expect(mockedCreateQuote).not.toHaveBeenCalled();
    });

    it("returns 400 with the validation reasons on invalid input", async () => {
      mockedRequireRole.mockResolvedValueOnce({
        tenantId: "test-tenant-id",
        userId: "test-user-id",
        role: "OWNER"
      });
      mockedCreateQuote.mockRejectedValueOnce(
        new QuoteValidationError(["La cotización debe incluir al menos un item."])
      );

      const response = await POST(makePostRequest({ items: [] }));

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { details: string[] } };
      expect(body.error.details).toEqual(["La cotización debe incluir al menos un item."]);
    });

    it("returns 201 on success", async () => {
      mockedRequireRole.mockResolvedValueOnce({
        tenantId: "test-tenant-id",
        userId: "test-user-id",
        role: "OWNER"
      });
      mockedCreateQuote.mockResolvedValueOnce({ id: "quote-1" } as never);

      const response = await POST(
        makePostRequest({ customerId: "customer-1", items: [{ productId: "product-1", quantity: 1 }] })
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ data: { id: "quote-1" } });
      expect(mockedCreateQuote).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: "customer-1" }),
        "test-tenant-id"
      );
    });
  });
});
