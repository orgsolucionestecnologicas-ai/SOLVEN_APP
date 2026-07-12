vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  processReturn,
  ReturnValidationError
} from "../../../modules/returns";
import { POST } from "./route";

vi.mock("../../../modules/returns", () => ({
  processReturn: vi.fn(),
  listReturns: vi.fn(),
  RETURN_REASON_CATEGORIES: ["DEFECTO", "ERROR_VENTA", "CAMBIO_OPINION", "OTRO"],
  ReturnValidationError: class ReturnValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ReturnValidationError";
    }
  }
}));

const mockedProcessReturn = vi.mocked(processReturn);

describe("returns API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a return successfully", async () => {
    const result = {
      returnId: "return-1",
      saleId: "sale-1",
      returnedItems: 1,
      totalReturned: "15.00"
    };
    mockedProcessReturn.mockResolvedValueOnce(result);

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: result });
    expect(mockedProcessReturn).toHaveBeenCalledWith(
      "sale-1",
      [{ productId: "product-1", quantity: 1 }],
      "test-tenant-id",
      "OTRO",
      undefined
    );
  });

  it("returns 400 when saleId is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "p-1", quantity: 1 }] })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("saleId");
  });

  it("returns 400 when items array is empty", async () => {
    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({ saleId: "sale-1", items: [] })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("producto");
  });

  it("returns 400 when a return item has zero quantity", async () => {
    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 0 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("cantidad");
  });

  it("returns 400 when reasonCategory is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }]
        })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("motivo");
  });

  it("returns 400 when reasonCategory is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "INVALIDO"
        })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("motivo");
  });

  it("returns 400 when sale is not found", async () => {
    mockedProcessReturn.mockRejectedValueOnce(
      new ReturnValidationError("La venta no fue encontrada.")
    );

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "missing-sale",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { message: "La venta no fue encontrada." }
    });
  });

  it("returns 400 when product does not belong to the sale", async () => {
    mockedProcessReturn.mockRejectedValueOnce(
      new ReturnValidationError(
        "El producto product-1 no pertenece a esta venta."
      )
    );

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "El producto product-1 no pertenece a esta venta."
      }
    });
  });

  it("returns 400 when return quantity exceeds sold quantity", async () => {
    mockedProcessReturn.mockRejectedValueOnce(
      new ReturnValidationError(
        "La cantidad a devolver (5) supera la cantidad vendida (2)."
      )
    );

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 5 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("supera");
  });

  it("returns 500 for unexpected errors", async () => {
    mockedProcessReturn.mockRejectedValueOnce(new Error("Database failure"));

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { message: "No se pudo procesar la devolución." }
    });
  });

  it("returns 400 when a double return exceeds the sold quantity", async () => {
    mockedProcessReturn.mockRejectedValueOnce(
      new ReturnValidationError(
        "La cantidad a devolver (2) supera el máximo permitido (1) para el producto product-1."
      )
    );

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("supera el máximo permitido");
  });

  it("returns 201 with returnId when a credit return is processed", async () => {
    const result = {
      returnId: "return-2",
      saleId: "sale-credit-1",
      returnedItems: 1,
      totalReturned: "30.00"
    };
    mockedProcessReturn.mockResolvedValueOnce(result);

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-credit-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: result });
  });
});
