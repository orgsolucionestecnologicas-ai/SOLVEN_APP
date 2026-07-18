vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: { findUnique: vi.fn(), create: vi.fn() },
    sale: { findFirst: vi.fn() },
    tenantARCAConfig: { findUnique: vi.fn() }
  }
}));

vi.mock("@/lib/arca", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/arca")>();
  return {
    ...actual,
    getARCACredentials: vi.fn(),
    buildARCAVoucher: vi.fn(),
    getLastVoucherNumber: vi.fn(),
    requestCAE: vi.fn()
  };
});

vi.mock("@/lib/arca/wsfe-client", () => ({
  WSFE_URLS: { homo: "https://homo.example", prod: "https://prod.example" }
}));

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ARCAConfigError,
  ARCAError,
  buildARCAVoucher,
  getARCACredentials,
  getLastVoucherNumber,
  requestCAE
} from "@/lib/arca";
import { prisma } from "@/lib/prisma";
import { emitInvoice } from "./invoice-data-access";

const mockedPrisma = vi.mocked(prisma, true);
const mockedGetARCACredentials = vi.mocked(getARCACredentials);
const mockedBuildARCAVoucher = vi.mocked(buildARCAVoucher);
const mockedGetLastVoucherNumber = vi.mocked(getLastVoucherNumber);
const mockedRequestCAE = vi.mocked(requestCAE);

const baseSale = {
  id: "sale-1",
  tenantId: "tenant-1",
  totalAmount: new Prisma.Decimal("121.00"),
  items: [
    {
      id: "item-1",
      productId: "product-1",
      serviceId: null,
      quantity: 2,
      unitPrice: new Prisma.Decimal("50.50"),
      ivaRate: 0.21,
      product: { id: "product-1", name: "Producto real" },
      service: null
    }
  ]
};

const baseConfig = {
  tenantId: "tenant-1",
  cuit: "20111111112",
  puntoVenta: 1,
  condicionIVA: "RI",
  ambiente: "homo"
};

const baseVoucher = {
  concepto: 1,
  docTipo: 99,
  docNro: "0",
  cbteDesde: 5,
  cbteHasta: 5,
  cbteFch: "20260101",
  impTotal: 121,
  impTotConc: 0,
  impNeto: 100,
  impOpEx: 0,
  impIVA: 21,
  impTrib: 0,
  monId: "PES",
  monCotiz: 1,
  iva: [],
  voucherType: 6
};

describe("emitInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.invoice.findUnique.mockResolvedValue(null);
    mockedPrisma.sale.findFirst.mockResolvedValue(baseSale as never);
    mockedPrisma.tenantARCAConfig.findUnique.mockResolvedValue(baseConfig as never);
    mockedGetARCACredentials.mockResolvedValue({ token: "t", sign: "s" } as never);
    mockedGetLastVoucherNumber.mockResolvedValue(4);
    mockedBuildARCAVoucher.mockReturnValue(baseVoucher);
    mockedRequestCAE.mockResolvedValue({
      cae: "12345678901234",
      caeFchVto: "20260201",
      voucherNumber: 5
    } as never);
    mockedPrisma.invoice.create.mockResolvedValue({
      id: "invoice-1",
      cae: "12345678901234",
      caeFchVto: "20260201",
      voucherNumber: 5,
      voucherType: 6,
      puntoVenta: 1,
      docTipo: 99,
      docNro: "0",
      impTotal: 121,
      impNeto: 100,
      impIVA: 21,
      impOpEx: 0
    } as never);
  });

  it("recalculates items and total from the real sale, ignoring anything the client sent", async () => {
    await emitInvoice({
      tenantId: "tenant-1",
      saleId: "sale-1",
      docTipo: 99,
      docNro: ""
    });

    expect(mockedPrisma.sale.findFirst).toHaveBeenCalledWith({
      where: { id: "sale-1", tenantId: "tenant-1" },
      include: { items: { include: { product: true, service: true } } }
    });

    expect(mockedBuildARCAVoucher).toHaveBeenCalledWith(
      [{ productName: "Producto real", quantity: 2, unitPrice: 50.5, ivaRate: 0.21 }],
      121,
      99,
      "",
      1,
      5,
      "RI",
      1
    );
  });

  it("rejects a saleId that does not belong to this tenant", async () => {
    mockedPrisma.sale.findFirst.mockResolvedValue(null);

    await expect(
      emitInvoice({ tenantId: "tenant-1", saleId: "sale-of-another-tenant", docTipo: 99, docNro: "" })
    ).rejects.toThrow(new ARCAError("La venta no fue encontrada para este comercio."));

    expect(mockedGetARCACredentials).not.toHaveBeenCalled();
    expect(mockedRequestCAE).not.toHaveBeenCalled();
  });

  it("still blocks double invoicing", async () => {
    mockedPrisma.invoice.findUnique.mockResolvedValueOnce({
      id: "existing-invoice",
      saleId: "sale-1",
      cae: "existing-cae"
    } as never);

    await expect(
      emitInvoice({ tenantId: "tenant-1", saleId: "sale-1", docTipo: 99, docNro: "" })
    ).rejects.toThrow("Esta venta ya tiene factura emitida (CAE: existing-cae)");

    expect(mockedPrisma.sale.findFirst).not.toHaveBeenCalled();
  });

  it("throws ARCAConfigError when the tenant has no ARCA config", async () => {
    mockedPrisma.tenantARCAConfig.findUnique.mockResolvedValueOnce(null);

    await expect(
      emitInvoice({ tenantId: "tenant-1", saleId: "sale-1", docTipo: 99, docNro: "" })
    ).rejects.toThrow(ARCAConfigError);
  });

  it("still drives the real WSAA/WSFE flow (credentials, voucher number, CAE request)", async () => {
    const result = await emitInvoice({
      tenantId: "tenant-1",
      saleId: "sale-1",
      docTipo: 99,
      docNro: "12345678"
    });

    expect(mockedGetARCACredentials).toHaveBeenCalledWith("tenant-1");
    expect(mockedGetLastVoucherNumber).toHaveBeenCalledWith(
      "https://homo.example",
      { token: "t", sign: "s" },
      "20111111112",
      1,
      6
    );
    expect(mockedRequestCAE).toHaveBeenCalledWith(
      "https://homo.example",
      { token: "t", sign: "s" },
      "20111111112",
      1,
      baseVoucher
    );
    expect(mockedPrisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        saleId: "sale-1",
        impTotal: 121
      })
    });
    expect(result.cae).toBe("12345678901234");
  });
});
