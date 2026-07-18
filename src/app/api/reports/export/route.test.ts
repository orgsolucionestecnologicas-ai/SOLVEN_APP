vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sale: { findMany: vi.fn() },
    product: { findMany: vi.fn() }
  }
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { GET } from "./route";

const mockedRequireTenantId = vi.mocked(requireTenantId);
const mockedFindManySales = vi.mocked(prisma.sale.findMany);
const mockedFindManyProducts = vi.mocked(prisma.product.findMany);

function makeRequest(query: string) {
  return new Request(`http://localhost/api/reports/export${query}`);
}

describe("GET /api/reports/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireTenantId.mockResolvedValue("test-tenant-id");
    mockedFindManySales.mockResolvedValue([]);
    mockedFindManyProducts.mockResolvedValue([]);
  });

  it("returns 401 without a session", async () => {
    mockedRequireTenantId.mockReset();
    mockedRequireTenantId.mockRejectedValueOnce(new UnauthorizedError());

    const response = await GET(makeRequest("?type=ventas"));

    expect(response.status).toBe(401);
    expect(mockedFindManySales).not.toHaveBeenCalled();
  });

  it("returns a sales CSV with the expected header", async () => {
    const response = await GET(makeRequest("?type=ventas"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    const body = await response.text();
    expect(body.startsWith("fecha,folio,cliente,forma_pago,productos,total")).toBe(true);
    expect(mockedFindManySales).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "test-tenant-id" }) })
    );
  });

  it("returns a products CSV with the expected header", async () => {
    const response = await GET(makeRequest("?type=productos"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    const body = await response.text();
    expect(
      body.startsWith("nombre,codigo,categoria,precio_costo,precio_venta,stock,stock_minimo,iva")
    ).toBe(true);
    expect(mockedFindManyProducts).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "test-tenant-id" } })
    );
  });

  it("returns 400 for an invalid report type", async () => {
    const response = await GET(makeRequest("?type=invalido"));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Tipo de reporte no válido.");
  });
});
