vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
  ARCAEmissionError,
  ARCAError,
  buildARCAVoucher,
  getARCACredentials,
  getLastVoucherNumber,
  requestCAE
} from "@/lib/arca";
import { prisma } from "@/lib/prisma";
import { emitInvoice, getInvoiceBySaleId } from "./invoice-data-access";

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

const reservedInvoice = {
  id: "invoice-1",
  cae: "",
  caeFchVto: "",
  voucherNumber: 5,
  voucherType: 6,
  puntoVenta: 1,
  docTipo: 99,
  docNro: "0",
  impTotal: 121,
  impNeto: 100,
  impIVA: 21,
  impOpEx: 0
};

const finalInvoice = {
  ...reservedInvoice,
  cae: "12345678901234",
  caeFchVto: "20260201"
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
    mockedPrisma.invoice.create.mockResolvedValue(reservedInvoice as never);
    mockedPrisma.invoice.update.mockResolvedValue(finalInvoice as never);
    mockedPrisma.invoice.delete.mockResolvedValue(reservedInvoice as never);
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

  it("still blocks double invoicing on the early check", async () => {
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
    expect(result.cae).toBe("12345678901234");
  });

  it("reserves a placeholder invoice row before calling AFIP, then completes it with the real CAE", async () => {
    await emitInvoice({ tenantId: "tenant-1", saleId: "sale-1", docTipo: 99, docNro: "" });

    expect(mockedPrisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        saleId: "sale-1",
        cae: "",
        caeFchVto: "",
        voucherNumber: 5
      })
    });

    const createOrder = mockedPrisma.invoice.create.mock.invocationCallOrder[0]!;
    const requestCAEOrder = mockedRequestCAE.mock.invocationCallOrder[0]!;
    expect(createOrder).toBeLessThan(requestCAEOrder);

    expect(mockedPrisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      data: expect.objectContaining({
        cae: "12345678901234",
        caeFchVto: "20260201",
        voucherNumber: 5
      })
    });
  });

  it("rejects a concurrent second emission that races past the early check", async () => {
    mockedPrisma.invoice.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0"
      })
    );
    mockedPrisma.invoice.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "invoice-raced",
      saleId: "sale-1",
      cae: "raced-cae"
    } as never);

    await expect(
      emitInvoice({ tenantId: "tenant-1", saleId: "sale-1", docTipo: 99, docNro: "" })
    ).rejects.toThrow("Esta venta ya tiene factura emitida (CAE: raced-cae)");

    expect(mockedRequestCAE).not.toHaveBeenCalled();
  });

  it("retries once with a fresh voucher number when AFIP reports the number was already used", async () => {
    mockedRequestCAE
      .mockRejectedValueOnce(new ARCAEmissionError("Comprobante ya autorizado", "10016"))
      .mockResolvedValueOnce({ cae: "99999999999999", caeFchVto: "20260301", voucherNumber: 6 } as never);
    mockedGetLastVoucherNumber.mockResolvedValueOnce(4).mockResolvedValueOnce(5);
    mockedBuildARCAVoucher
      .mockReturnValueOnce(baseVoucher)
      .mockReturnValueOnce({ ...baseVoucher, cbteDesde: 6, cbteHasta: 6 });

    const result = await emitInvoice({ tenantId: "tenant-1", saleId: "sale-1", docTipo: 99, docNro: "" });

    expect(mockedRequestCAE).toHaveBeenCalledTimes(2);
    expect(mockedPrisma.invoice.delete).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("does not retry and cleans up the reservation when AFIP rejects for another reason", async () => {
    mockedRequestCAE.mockRejectedValueOnce(new ARCAEmissionError("CUIT inválido", "500"));

    await expect(
      emitInvoice({ tenantId: "tenant-1", saleId: "sale-1", docTipo: 99, docNro: "" })
    ).rejects.toThrow("CUIT inválido");

    expect(mockedRequestCAE).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.invoice.delete).toHaveBeenCalledWith({ where: { id: "invoice-1" } });
  });
});

describe("getInvoiceBySaleId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the lookup to the given tenant", async () => {
    mockedPrisma.invoice.findFirst.mockResolvedValue(null);
    await getInvoiceBySaleId("sale-1", "tenant-1");

    expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
      where: { saleId: "sale-1", tenantId: "tenant-1" }
    });
  });
});
