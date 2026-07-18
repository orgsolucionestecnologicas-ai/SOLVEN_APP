import { prisma } from "@/lib/prisma";
import {
  getARCACredentials,
  buildARCAVoucher,
  getLastVoucherNumber,
  requestCAE,
  ARCAConfigError,
  ARCAError,
} from "@/lib/arca";
import { WSFE_URLS } from "@/lib/arca/wsfe-client";
import type { CartItemForInvoice } from "@/lib/arca";

export type EmitInvoiceInput = {
  tenantId: string;
  saleId: string;
  docTipo: number;  // 99=Consumidor Final, 96=DNI, 80=CUIT
  docNro: string;
  concepto?: number;
};

export type EmittedInvoice = {
  id: string;
  cae: string;
  caeFchVto: string;
  voucherNumber: number;
  voucherType: number;
  puntoVenta: number;
  docTipo: number;
  docNro: string;
  cuit: string;
};

export async function emitInvoice(input: EmitInvoiceInput): Promise<EmittedInvoice> {
  // Guard: prevent double invoicing
  const existing = await prisma.invoice.findUnique({ where: { saleId: input.saleId } });
  if (existing) {
    throw new ARCAError(`Esta venta ya tiene factura emitida (CAE: ${existing.cae})`);
  }

  // Load the real sale for this tenant — never trust items/total from the client
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, tenantId: input.tenantId },
    include: { items: { include: { product: true, service: true } } },
  });
  if (!sale) {
    throw new ARCAError("La venta no fue encontrada para este comercio.");
  }

  const items: CartItemForInvoice[] = sale.items.map((item) => ({
    productName: item.product?.name ?? item.service?.name ?? "Producto/Servicio",
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    ivaRate: item.ivaRate,
  }));
  const total = Number(sale.totalAmount);

  // Load config
  const config = await prisma.tenantARCAConfig.findUnique({ where: { tenantId: input.tenantId } });
  if (!config) throw new ARCAConfigError("No hay configuración ARCA para este tenant");

  const wsfeUrl = WSFE_URLS[config.ambiente as "homo" | "prod"] ?? WSFE_URLS.homo;

  // Get WSAA token (cached or fresh)
  const credentials = await getARCACredentials(input.tenantId);

  // Determine voucher type and get next number
  const voucherType = input.docTipo === 80 && config.condicionIVA === "RI" ? 1
    : config.condicionIVA === "MONO" ? 11
    : 6;

  const lastNumber = await getLastVoucherNumber(
    wsfeUrl,
    credentials,
    config.cuit,
    config.puntoVenta,
    voucherType
  );
  const nextNumber = lastNumber + 1;

  // Build voucher
  const voucher = buildARCAVoucher(
    items,
    total,
    input.docTipo,
    input.docNro,
    config.puntoVenta,
    nextNumber,
    config.condicionIVA,
    input.concepto ?? 1
  );

  // Request CAE from AFIP
  const caeResult = await requestCAE(wsfeUrl, credentials, config.cuit, config.puntoVenta, voucher);

  // Persist invoice record
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: input.tenantId,
      saleId: input.saleId,
      cae: caeResult.cae,
      caeFchVto: caeResult.caeFchVto,
      voucherNumber: caeResult.voucherNumber,
      voucherType: voucher.voucherType,
      puntoVenta: config.puntoVenta,
      docTipo: input.docTipo,
      docNro: input.docNro,
      impTotal: total,
      impNeto: voucher.impNeto,
      impIVA: voucher.impIVA,
      impOpEx: voucher.impOpEx,
    },
  });

  return {
    id: invoice.id,
    cae: invoice.cae,
    caeFchVto: invoice.caeFchVto,
    voucherNumber: invoice.voucherNumber,
    voucherType: invoice.voucherType,
    puntoVenta: invoice.puntoVenta,
    docTipo: invoice.docTipo,
    docNro: invoice.docNro,
    cuit: config.cuit,
  };
}

export async function getInvoiceBySaleId(saleId: string) {
  return prisma.invoice.findUnique({ where: { saleId } });
}

export async function listInvoices(tenantId: string, page = 1, limit = 50) {
  const where = { tenantId };
  const [data, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.invoice.count({ where }),
  ]);
  return { data, total };
}
