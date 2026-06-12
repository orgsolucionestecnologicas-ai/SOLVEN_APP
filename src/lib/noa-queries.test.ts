import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "./prisma";
import { executeNoaQuery, registrarConsulta } from "./noa-queries";

vi.mock("./prisma", () => ({
  prisma: {
    sale: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      aggregate: vi.fn().mockResolvedValue({ _count: { id: 0 }, _sum: { totalAmount: null } }),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    debt: { findMany: vi.fn().mockResolvedValue([]) },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      fields: { minStock: "minStock-field-ref" },
    },
    expense: {
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }),
    },
    cashRegisterSession: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    cashMovement: {
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }),
    },
    quote: { findMany: vi.fn().mockResolvedValue([]) },
    saleItem: { groupBy: vi.fn().mockResolvedValue([]) },
    service: { findMany: vi.fn().mockResolvedValue([]) },
    promotion: { findMany: vi.fn().mockResolvedValue([]) },
    return: { findMany: vi.fn().mockResolvedValue([]) },
    storeSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    tenant: { findUnique: vi.fn().mockResolvedValue(null) },
    tenantARCAConfig: { findUnique: vi.fn().mockResolvedValue(null) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    subscription: { findUnique: vi.fn().mockResolvedValue(null) },
    category: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    helpQuery: { create: vi.fn().mockResolvedValue({}) },
  },
}));

const mocked = vi.mocked(prisma, true);
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NOA queries", () => {
  it("filtra ventas por tenantId", async () => {
    await executeNoaQuery(TENANT_A, "buscar_ventas", { query: "Garcia" });
    expect(mocked.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) })
    );
  });

  it("filtra clientes por tenantId", async () => {
    await executeNoaQuery(TENANT_A, "buscar_clientes", { query: "Perez" });
    expect(mocked.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) })
    );
  });

  it("filtra deuda por tenantId", async () => {
    mocked.customer.findFirst.mockResolvedValueOnce({ id: "c1", name: "Perez" } as never);
    await executeNoaQuery(TENANT_A, "ver_deuda_cliente", { nombre: "Perez" });
    expect(mocked.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) })
    );
    expect(mocked.debt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A, customerId: "c1" }) })
    );
  });

  it("filtra detalle de venta por tenantId y folio", async () => {
    await executeNoaQuery(TENANT_A, "detalle_venta", { folio: 42 });
    expect(mocked.sale.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A, folio: 42 }) })
    );
  });

  it("dos tenants distintos no comparten filtros", async () => {
    await executeNoaQuery(TENANT_A, "buscar_ventas", {});
    await executeNoaQuery(TENANT_B, "buscar_ventas", {});
    const calls = mocked.sale.findMany.mock.calls;
    expect(calls[0][0]?.where).toMatchObject({ tenantId: TENANT_A });
    expect(calls[1][0]?.where).toMatchObject({ tenantId: TENANT_B });
  });

  it("registra consultas con tenantId del servidor", async () => {
    await registrarConsulta(TENANT_A, "pregunta rara");
    expect(mocked.helpQuery.create).toHaveBeenCalledWith({
      data: { tenantId: TENANT_A, question: "pregunta rara" },
    });
  });
});
