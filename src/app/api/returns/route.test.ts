vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";
import {
  listReturns,
  processReturn,
  ReturnConcurrentConflictError,
  ReturnValidationError,
  type ReturnListRecord
} from "../../../modules/returns";
import { SaleNoCashRegisterOpenError } from "../../../modules/sales";
import { GET, POST } from "./route";

vi.mock("../../../modules/returns", () => ({
  processReturn: vi.fn(),
  listReturns: vi.fn(),
  RETURN_REASON_CATEGORIES: ["DEFECTO", "ERROR_VENTA", "CAMBIO_OPINION", "OTRO"],
  RETURN_REFUND_METHODS: ["Efectivo", "Tarjeta", "Transferencia", "VentaWeb", "Otro"],
  ReturnValidationError: class ReturnValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ReturnValidationError";
    }
  },
  ReturnConcurrentConflictError: class ReturnConcurrentConflictError extends Error {
    constructor() {
      super(
        "La devolución no se pudo procesar porque otra operación modificó la misma venta al mismo tiempo. Volvé a intentarlo."
      );
      this.name = "ReturnConcurrentConflictError";
    }
  }
}));

vi.mock("../../../modules/sales", () => ({
  SaleNoCashRegisterOpenError: class SaleNoCashRegisterOpenError extends Error {
    constructor() {
      super("No hay una sesión de caja abierta. Abrí la caja antes de registrar una venta en efectivo.");
      this.name = "SaleNoCashRegisterOpenError";
    }
  }
}));

vi.mock("@/modules/audit", () => ({
  logAudit: vi.fn()
}));

const mockedProcessReturn = vi.mocked(processReturn);
const mockedListReturns = vi.mocked(listReturns);
const mockedRequireRole = vi.mocked(requireRole);
const mockedLogAudit = vi.mocked(logAudit);

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
      undefined,
      undefined,
      undefined
    );
  });

  it("passes refundMethod through to processReturn", async () => {
    const result = {
      returnId: "return-3",
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
          reasonCategory: "OTRO",
          refundMethod: "Tarjeta",
          refundReference: "000123456"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mockedProcessReturn).toHaveBeenCalledWith(
      "sale-1",
      [{ productId: "product-1", quantity: 1 }],
      "test-tenant-id",
      "OTRO",
      undefined,
      "Tarjeta",
      "000123456"
    );
  });

  it("returns 400 when refundMethod is not a known value", async () => {
    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO",
          refundMethod: "Bitcoin"
        })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("reintegro");
    expect(mockedProcessReturn).not.toHaveBeenCalled();
  });

  it("returns 400 when processReturn rejects a missing refundMethod on a non-credit sale", async () => {
    mockedProcessReturn.mockRejectedValueOnce(
      new ReturnValidationError("Debés indicar cómo se reintegra el dinero.")
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
      error: { message: "Debés indicar cómo se reintegra el dinero." }
    });
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

  it("returns 403 from GET when the role lacks access to returns", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await GET(new Request("http://localhost/api/returns"));

    expect(response.status).toBe(403);
    expect(mockedListReturns).not.toHaveBeenCalled();
  });

  it("returns a paginated list on GET", async () => {
    const record: ReturnListRecord = {
      id: "return-1",
      saleId: "sale-1",
      totalAmount: new Prisma.Decimal(15),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      reasonCategory: "OTRO",
      reasonNote: null,
      refundMethod: "Efectivo",
      sale: { id: "sale-1", folio: 1, saleDate: new Date("2026-08-01T00:00:00.000Z"), customerName: null },
      items: [{ id: "ri-1", productId: "product-1", productName: "Producto 1", quantity: 1 }]
    };
    mockedListReturns.mockResolvedValueOnce({ data: [record], total: 1 });

    const response = await GET(new Request("http://localhost/api/returns"));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: unknown[]; pagination: { total: number } };
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
    expect(mockedListReturns).toHaveBeenCalled();
  });

  it("returns 409 when there is no open cash register for a cash refund", async () => {
    mockedProcessReturn.mockRejectedValueOnce(new SaleNoCashRegisterOpenError());

    const response = await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO",
          refundMethod: "Efectivo"
        })
      })
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("caja abierta");
  });

  it("returns 409 on a concurrent modification conflict", async () => {
    mockedProcessReturn.mockRejectedValueOnce(new ReturnConcurrentConflictError());

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

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("mismo tiempo");
  });

  it("logs a RETURN_CREATED audit entry after a successful return", async () => {
    const result = {
      returnId: "return-9",
      saleId: "sale-1",
      returnedItems: 1,
      totalReturned: "15.00"
    };
    mockedProcessReturn.mockResolvedValueOnce(result);

    await POST(
      new Request("http://localhost/api/returns", {
        method: "POST",
        body: JSON.stringify({
          saleId: "sale-1",
          items: [{ productId: "product-1", quantity: 1 }],
          reasonCategory: "OTRO",
          refundMethod: "Tarjeta",
          refundReference: "000123456"
        })
      })
    );

    expect(mockedLogAudit).toHaveBeenCalledWith({
      tenantId: "test-tenant-id",
      userId: "test-user-id",
      action: "RETURN_CREATED",
      entityType: "Return",
      entityId: "return-9",
      metadata: {
        saleId: "sale-1",
        totalReturned: "15.00",
        refundMethod: "Tarjeta"
      }
    });
  });
});
