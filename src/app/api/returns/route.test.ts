import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  processReturn,
  ReturnValidationError
} from "../../../modules/returns";
import { POST } from "./route";

vi.mock("../../../modules/returns", () => ({
  processReturn: vi.fn(),
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
          items: [{ productId: "product-1", quantity: 1 }]
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: result });
    expect(mockedProcessReturn).toHaveBeenCalledWith("sale-1", [
      { productId: "product-1", quantity: 1 }
    ]);
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
          items: [{ productId: "product-1", quantity: 0 }]
        })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("cantidad");
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
          items: [{ productId: "product-1", quantity: 1 }]
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
          items: [{ productId: "product-1", quantity: 1 }]
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
          items: [{ productId: "product-1", quantity: 5 }]
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
          items: [{ productId: "product-1", quantity: 1 }]
        })
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { message: "No se pudo procesar la devolución." }
    });
  });
});
