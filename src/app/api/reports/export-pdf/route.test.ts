vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeSettings: { findUnique: vi.fn() },
    sale: { findMany: vi.fn() },
    product: { findMany: vi.fn() }
  }
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-pdf"))
}));

vi.mock("@/app/ui/report-pdf", () => ({
  ReportPDFDocument: () => null
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { GET } from "./route";

const mockedRequireRole = vi.mocked(requireRole);
const mockedFindManySales = vi.mocked(prisma.sale.findMany);
const mockedFindManyProducts = vi.mocked(prisma.product.findMany);
const mockedFindStoreSettings = vi.mocked(prisma.storeSettings.findUnique);

function makeRequest(query: string) {
  return new Request(`http://localhost/api/reports/export-pdf${query}`);
}

describe("GET /api/reports/export-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireRole.mockResolvedValue({ tenantId: "test-tenant-id", userId: "user-1", role: "OWNER" });
    mockedFindManySales.mockResolvedValue([]);
    mockedFindManyProducts.mockResolvedValue([]);
    mockedFindStoreSettings.mockResolvedValue({ businessName: "Mi Comercio" } as never);
  });

  it("returns 401 without a session", async () => {
    mockedRequireRole.mockReset();
    mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

    const response = await GET(makeRequest("?type=ventas"));

    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-OWNER role", async () => {
    mockedRequireRole.mockReset();
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await GET(makeRequest("?type=ventas"));

    expect(response.status).toBe(403);
  });

  it("returns 200 with a PDF for the tenant's sales", async () => {
    const response = await GET(makeRequest("?type=ventas"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(mockedFindManySales).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "test-tenant-id" }) })
    );
  });

  it("returns 200 with a PDF for the tenant's products", async () => {
    const response = await GET(makeRequest("?type=productos"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(mockedFindManyProducts).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "test-tenant-id" } })
    );
  });

  it("returns 400 for an invalid report type", async () => {
    const response = await GET(makeRequest("?type=invalido"));

    expect(response.status).toBe(400);
  });
});
