vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARCAError } from "@/lib/arca";
import { emitInvoice } from "@/modules/invoices";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { POST } from "./route";

vi.mock("@/modules/invoices", () => ({
  emitInvoice: vi.fn()
}));

const mockedEmitInvoice = vi.mocked(emitInvoice);
const mockedRequireRole = vi.mocked(requireRole);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/invoices", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("invoices API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireRole.mockResolvedValue({
      tenantId: "test-tenant-id",
      userId: "test-user-id",
      role: "OWNER"
    });
  });

  it("returns 403 when the caller lacks the required role", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await POST(
      makeRequest({ saleId: "sale-1", docTipo: 99, docNro: "" })
    );

    expect(response.status).toBe(403);
    expect(mockedEmitInvoice).not.toHaveBeenCalled();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    mockedRequireRole.mockRejectedValueOnce(new UnauthorizedError());

    const response = await POST(
      makeRequest({ saleId: "sale-1", docTipo: 99, docNro: "" })
    );

    expect(response.status).toBe(401);
    expect(mockedEmitInvoice).not.toHaveBeenCalled();
  });

  it("returns 400 when saleId is missing", async () => {
    const response = await POST(makeRequest({ docTipo: 99, docNro: "" }));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("saleId");
    expect(mockedEmitInvoice).not.toHaveBeenCalled();
  });

  it("returns 400 when docTipo is not one of the allowed values", async () => {
    const response = await POST(
      makeRequest({ saleId: "sale-1", docTipo: 12, docNro: "12345678" })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("docTipo");
    expect(mockedEmitInvoice).not.toHaveBeenCalled();
  });

  it("returns 400 when docTipo is missing", async () => {
    const response = await POST(makeRequest({ saleId: "sale-1", docNro: "" }));

    expect(response.status).toBe(400);
    expect(mockedEmitInvoice).not.toHaveBeenCalled();
  });

  it("accepts the 3 allowed docTipo values and never forwards items/total to emitInvoice", async () => {
    mockedEmitInvoice.mockResolvedValue({
      id: "invoice-1",
      cae: "cae-1",
      caeFchVto: "20260101",
      voucherNumber: 1,
      voucherType: 6,
      puntoVenta: 1,
      docTipo: 99,
      docNro: "0",
      cuit: "20111111112"
    });

    for (const docTipo of [99, 96, 80]) {
      const response = await POST(
        makeRequest({
          saleId: "sale-1",
          docTipo,
          docNro: "12345678",
          // an attacker-controlled payload — must be ignored by the route
          items: [{ productName: "Producto falso", quantity: 999, unitPrice: 1, ivaRate: 0 }],
          total: 999999
        })
      );

      expect(response.status).toBe(201);
    }

    expect(mockedEmitInvoice).toHaveBeenCalledTimes(3);
    for (const call of mockedEmitInvoice.mock.calls) {
      const input = call[0] as Record<string, unknown>;
      expect(input).not.toHaveProperty("items");
      expect(input).not.toHaveProperty("total");
      expect(input.tenantId).toBe("test-tenant-id");
      expect(input.saleId).toBe("sale-1");
    }
  });

  it("returns 201 on the happy path with emitInvoice's result", async () => {
    const result = {
      id: "invoice-1",
      cae: "12345678901234",
      caeFchVto: "20260201",
      voucherNumber: 5,
      voucherType: 6,
      puntoVenta: 1,
      docTipo: 99,
      docNro: "0",
      cuit: "20111111112"
    };
    mockedEmitInvoice.mockResolvedValueOnce(result);

    const response = await POST(
      makeRequest({ saleId: "sale-1", docTipo: 99, docNro: "" })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: result });
    expect(mockedEmitInvoice).toHaveBeenCalledWith({
      tenantId: "test-tenant-id",
      saleId: "sale-1",
      docTipo: 99,
      docNro: "",
      concepto: undefined
    });
  });

  it("returns 422 with the ARCAError message when the sale does not belong to the tenant", async () => {
    mockedEmitInvoice.mockRejectedValueOnce(
      new ARCAError("La venta no fue encontrada para este comercio.")
    );

    const response = await POST(
      makeRequest({ saleId: "sale-of-another-tenant", docTipo: 99, docNro: "" })
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toBe("La venta no fue encontrada para este comercio.");
  });

  it("returns 422 when the sale was already invoiced", async () => {
    mockedEmitInvoice.mockRejectedValueOnce(
      new ARCAError("Esta venta ya tiene factura emitida (CAE: 123)")
    );

    const response = await POST(
      makeRequest({ saleId: "sale-1", docTipo: 99, docNro: "" })
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("ya tiene factura emitida");
  });

  it("returns 500 for unexpected errors", async () => {
    mockedEmitInvoice.mockRejectedValueOnce(new Error("AFIP unreachable"));

    const response = await POST(
      makeRequest({ saleId: "sale-1", docTipo: 99, docNro: "" })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { message: "Error interno al emitir factura." }
    });
  });
});
