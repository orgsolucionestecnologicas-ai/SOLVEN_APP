import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import type { NoaIntentName, NoaIntentParams } from "./noa-intent-engine";

const MAX_ROWS = 20;

type Row = Record<string, string | number | boolean | null>;

export type NoaQueryResult = {
  rows: Row[];
  meta?: Record<string, string | number | boolean | null>;
};

function asNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function fromDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setHours(23, 59, 59, 999);
  return date;
}

function dateWhere(fieldFrom?: string, fieldTo?: string) {
  const gte = fromDate(fieldFrom);
  const lte = toDate(fieldTo);
  if (!gte && !lte) return undefined;
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

function defaultRange(periodo?: string) {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (periodo === "semana") from.setDate(from.getDate() - 6);
  if (periodo === "mes") from.setDate(1);
  return { from, to };
}

function queryText(params: NoaIntentParams) {
  return params.query?.trim() || params.nombre?.trim();
}

export async function buscarVentas(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const where: Prisma.SaleWhereInput = { tenantId };
  const query = queryText(params);
  if (query) {
    const folio = Number(query);
    where.OR = [
      { customer: { name: { contains: query, mode: "insensitive" } } },
      ...(Number.isInteger(folio) ? [{ folio }] : []),
    ];
  }
  if (params.folio) where.folio = params.folio;
  if (params.receiptType) where.receiptType = params.receiptType;
  const saleDate = dateWhere(params.dateFrom, params.dateTo);
  if (saleDate) where.saleDate = saleDate;

  const sales = await prisma.sale.findMany({
    where,
    select: {
      folio: true,
      receiptType: true,
      cae: true,
      totalAmount: true,
      saleDate: true,
      paymentType: true,
      customer: { select: { name: true } },
    },
    orderBy: { saleDate: "desc" },
    take: MAX_ROWS,
  });

  return {
    rows: sales.map((sale) => ({
      folio: sale.folio,
      fecha: sale.saleDate.toISOString(),
      cliente: sale.customer?.name ?? "Consumidor final",
      monto: asNumber(sale.totalAmount),
      pago: sale.paymentType,
      comprobante: sale.cae ? "FACTURA" : "TICKET",
      cae: sale.cae,
    })),
  };
}

export async function buscarClientes(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      name: true,
      phone: true,
      email: true,
      debts: { select: { remainingAmount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });

  return {
    rows: customers.map((customer) => ({
      nombre: customer.name,
      telefono: customer.phone,
      email: customer.email,
      deuda: customer.debts.reduce((sum, debt) => sum + asNumber(debt.remainingAmount), 0),
    })),
  };
}

export async function verDeudaCliente(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  if (!query) return clientesConDeuda(tenantId);

  const customer = await prisma.customer.findFirst({
    where: { tenantId, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!customer) return { rows: [] };

  const debts = await prisma.debt.findMany({
    where: { tenantId, customerId: customer.id, remainingAmount: { gt: 0 } },
    select: {
      totalAmount: true,
      remainingAmount: true,
      createdAt: true,
      payments: { select: { amount: true, paymentDate: true }, orderBy: { paymentDate: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });

  return {
    rows: debts.map((debt) => ({
      cliente: customer.name,
      fecha: debt.createdAt.toISOString(),
      montoOriginal: asNumber(debt.totalAmount),
      saldoPendiente: asNumber(debt.remainingAmount),
      pagos: debt.payments.reduce((sum, payment) => sum + asNumber(payment.amount), 0),
    })),
    meta: {
      cliente: customer.name,
      deudaPendiente: debts.reduce((sum, debt) => sum + asNumber(debt.remainingAmount), 0),
    },
  };
}

export async function buscarProductos(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { productCode: { contains: query, mode: "insensitive" } },
              { categoryName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      name: true,
      productCode: true,
      salePrice: true,
      stock: true,
      minStock: true,
      ivaRate: true,
      categoryName: true,
    },
    orderBy: { name: "asc" },
    take: MAX_ROWS,
  });

  return {
    rows: products.map((product) => ({
      producto: product.name,
      codigo: product.productCode,
      precio: asNumber(product.salePrice),
      stock: product.stock,
      minimo: product.minStock,
      iva: product.ivaRate,
      categoria: product.categoryName,
    })),
  };
}

export async function productosBajoStock(tenantId: string): Promise<NoaQueryResult> {
  const products = await prisma.product.findMany({
    where: { tenantId, stock: { lte: prisma.product.fields.minStock } },
    select: { name: true, productCode: true, stock: true, minStock: true },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    take: MAX_ROWS,
  });
  return {
    rows: products.map((product) => ({
      producto: product.name,
      codigo: product.productCode,
      stock: product.stock,
      minimo: product.minStock,
      sinStock: product.stock <= 0,
    })),
  };
}

export async function resumenNegocio(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const range = defaultRange(params.periodo);
  const from = fromDate(params.dateFrom) ?? range.from;
  const to = toDate(params.dateTo) ?? range.to;
  const [salesAgg, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { tenantId, saleDate: { gte: from, lte: to } },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, expenseDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
  ]);
  const ingresos = asNumber(salesAgg._sum.totalAmount);
  const gastos = asNumber(expensesAgg._sum.amount);
  return {
    rows: [
      {
        desde: from.toISOString(),
        hasta: to.toISOString(),
        ventas: salesAgg._count.id,
        ingresos,
        gastos,
        balance: ingresos - gastos,
      },
    ],
  };
}

export async function estadoCaja(tenantId: string): Promise<NoaQueryResult> {
  const session = await prisma.cashRegisterSession.findFirst({
    where: { tenantId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
  if (!session) return { rows: [{ cajaAbierta: false }] };

  const [inAgg, outAgg] = await Promise.all([
    prisma.cashMovement.aggregate({
      where: { tenantId, movementDate: { gte: session.openedAt }, type: "IN" },
      _sum: { amount: true },
    }),
    prisma.cashMovement.aggregate({
      where: { tenantId, movementDate: { gte: session.openedAt }, type: "OUT" },
      _sum: { amount: true },
    }),
  ]);
  const entradas = asNumber(inAgg._sum.amount);
  const salidas = asNumber(outAgg._sum.amount);
  const apertura = asNumber(session.openingAmount);
  return {
    rows: [
      {
        cajaAbierta: true,
        cajero: session.cashierName,
        abiertaDesde: session.openedAt.toISOString(),
        apertura,
        entradas,
        salidas,
        saldoEsperado: apertura + entradas - salidas,
      },
    ],
  };
}

export async function buscarCotizaciones(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  const where: Prisma.QuoteWhereInput = {
    tenantId,
    ...(params.status ? { status: params.status } : {}),
  };
  if (query) {
    where.OR = [
      { quoteNumber: { contains: query, mode: "insensitive" } },
      { customerName: { contains: query, mode: "insensitive" } },
      { customer: { name: { contains: query, mode: "insensitive" } } },
    ];
  }
  const createdAt = dateWhere(params.dateFrom, params.dateTo);
  if (createdAt) where.createdAt = createdAt;

  const quotes = await prisma.quote.findMany({
    where,
    select: {
      quoteNumber: true,
      customerName: true,
      customer: { select: { name: true } },
      totalAmount: true,
      status: true,
      validUntil: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: quotes.map((quote) => ({
      cotizacion: quote.quoteNumber,
      cliente: quote.customer?.name || quote.customerName || "Sin cliente",
      total: asNumber(quote.totalAmount),
      estado: quote.status,
      validaHasta: quote.validUntil.toISOString(),
      fecha: quote.createdAt.toISOString(),
    })),
  };
}

export async function verGastos(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const where: Prisma.ExpenseWhereInput = { tenantId };
  const expenseDate = dateWhere(params.dateFrom, params.dateTo);
  if (expenseDate) where.expenseDate = expenseDate;
  const expenses = await prisma.expense.findMany({
    where,
    select: { category: true, amount: true, description: true, expenseDate: true },
    orderBy: { expenseDate: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: expenses.map((expense) => ({
      categoria: expense.category,
      monto: asNumber(expense.amount),
      descripcion: expense.description,
      fecha: expense.expenseDate.toISOString(),
    })),
    meta: { total: expenses.reduce((sum, expense) => sum + asNumber(expense.amount), 0) },
  };
}

export async function movimientosCaja(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const where: Prisma.CashMovementWhereInput = { tenantId };
  const movementDate = dateWhere(params.dateFrom, params.dateTo);
  if (movementDate) where.movementDate = movementDate;
  const movements = await prisma.cashMovement.findMany({
    where,
    select: { type: true, amount: true, source: true, referenceId: true, movementDate: true },
    orderBy: { movementDate: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: movements.map((movement) => ({
      tipo: movement.type,
      monto: asNumber(movement.amount),
      origen: movement.source,
      referencia: movement.referenceId,
      fecha: movement.movementDate.toISOString(),
    })),
  };
}

export async function productosMasVendidos(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const { from, to } = defaultRange(params.periodo ?? "mes");
  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, sale: { tenantId, saleDate: { gte: from, lte: to } } },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: Math.min(params.limit ?? 10, 10),
  });
  const ids = grouped.map((group) => group.productId).filter((id): id is string => Boolean(id));
  const products = await prisma.product.findMany({
    where: { tenantId, id: { in: ids } },
    select: { id: true, name: true },
  });
  const names = new Map(products.map((product) => [product.id, product.name]));
  return {
    rows: grouped.map((group, index) => ({
      puesto: index + 1,
      producto: names.get(group.productId ?? "") ?? "Producto eliminado",
      unidades: group._sum.quantity ?? 0,
      ingresos: asNumber(group._sum.total),
    })),
  };
}

export async function clientesConDeuda(tenantId: string): Promise<NoaQueryResult> {
  const debts = await prisma.debt.findMany({
    where: { tenantId, remainingAmount: { gt: 0 } },
    select: { remainingAmount: true, customer: { select: { id: true, name: true } } },
  });
  const grouped = new Map<string, { nombre: string; deuda: number }>();
  for (const debt of debts) {
    const current = grouped.get(debt.customer.id) ?? { nombre: debt.customer.name, deuda: 0 };
    current.deuda += asNumber(debt.remainingAmount);
    grouped.set(debt.customer.id, current);
  }
  return { rows: Array.from(grouped.values()).sort((a, b) => b.deuda - a.deuda).slice(0, MAX_ROWS) };
}

export async function buscarServicios(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true, ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) },
    select: { code: true, name: true, price: true, description: true },
    orderBy: { name: "asc" },
    take: MAX_ROWS,
  });
  return {
    rows: services.map((service) => ({
      codigo: service.code,
      servicio: service.name,
      precio: asNumber(service.price),
      descripcion: service.description,
    })),
  };
}

export async function verPromosActivas(tenantId: string): Promise<NoaQueryResult> {
  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: { tenantId, isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    select: { name: true, type: true, discountValue: true, code: true, activationType: true, endsAt: true },
    orderBy: { endsAt: "asc" },
    take: MAX_ROWS,
  });
  return {
    rows: promos.map((promo) => ({
      promo: promo.name,
      tipo: promo.type,
      valor: asNumber(promo.discountValue),
      codigo: promo.code,
      activacion: promo.activationType,
      vence: promo.endsAt.toISOString(),
    })),
  };
}

export async function historialCliente(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  if (!query) return { rows: [] };
  const customer = await prisma.customer.findFirst({
    where: { tenantId, name: { contains: query, mode: "insensitive" } },
    select: {
      name: true,
      sales: {
        select: { folio: true, saleDate: true, totalAmount: true, paymentType: true },
        orderBy: { saleDate: "desc" },
        take: MAX_ROWS,
      },
      debts: { select: { remainingAmount: true } },
    },
  });
  if (!customer) return { rows: [] };
  return {
    rows: customer.sales.map((sale) => ({
      cliente: customer.name,
      folio: sale.folio,
      fecha: sale.saleDate.toISOString(),
      total: asNumber(sale.totalAmount),
      pago: sale.paymentType,
    })),
    meta: {
      cliente: customer.name,
      compras: customer.sales.length,
      deuda: customer.debts.reduce((sum, debt) => sum + asNumber(debt.remainingAmount), 0),
    },
  };
}

export async function buscarDevoluciones(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  const returns = await prisma.return.findMany({
    where: {
      sale: {
        tenantId,
        ...(query
          ? { OR: [{ customer: { name: { contains: query, mode: "insensitive" } } }] }
          : {}),
        ...(params.folio ? { folio: params.folio } : {}),
      },
    },
    select: {
      totalAmount: true,
      createdAt: true,
      sale: { select: { folio: true, customer: { select: { name: true } } } },
      items: { select: { productId: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: returns.map((item) => ({
      venta: item.sale.folio,
      cliente: item.sale.customer?.name ?? "Consumidor final",
      monto: asNumber(item.totalAmount),
      items: item.items.length,
      fecha: item.createdAt.toISOString(),
    })),
  };
}

export async function movimientosInventario(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      tenantId,
      ...(query ? { product: { name: { contains: query, mode: "insensitive" } } } : {}),
    },
    select: {
      movementDate: true,
      reason: true,
      previousStock: true,
      newStock: true,
      quantityChange: true,
      product: { select: { name: true } },
    },
    orderBy: { movementDate: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: movements.map((movement) => ({
      producto: movement.product.name,
      fecha: movement.movementDate.toISOString(),
      motivo: movement.reason,
      anterior: movement.previousStock,
      nuevo: movement.newStock,
      cambio: movement.quantityChange,
    })),
  };
}

export async function detalleVenta(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const query = queryText(params);
  const sale = await prisma.sale.findFirst({
    where: {
      tenantId,
      ...(params.folio ? { folio: params.folio } : {}),
      ...(!params.folio && query ? { customer: { name: { contains: query, mode: "insensitive" } } } : {}),
    },
    select: {
      folio: true,
      saleDate: true,
      totalAmount: true,
      customer: { select: { name: true } },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          total: true,
          product: { select: { name: true } },
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { saleDate: "desc" },
  });
  if (!sale) return { rows: [] };
  return {
    rows: sale.items.map((item) => ({
      folio: sale.folio,
      cliente: sale.customer?.name ?? "Consumidor final",
      item: item.product?.name ?? item.service?.name ?? "Item eliminado",
      cantidad: item.quantity,
      precioUnitario: asNumber(item.unitPrice),
      total: asNumber(item.total),
    })),
    meta: { folio: sale.folio, fecha: sale.saleDate.toISOString(), total: asNumber(sale.totalAmount) },
  };
}

export async function compararPeriodos(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  const compare = params.compare ?? params.periodo ?? "mes";
  const current = defaultRange(compare);
  const previousTo = new Date(current.from);
  previousTo.setMilliseconds(previousTo.getMilliseconds() - 1);
  const previousFrom = new Date(previousTo);
  if (compare === "dia") previousFrom.setHours(0, 0, 0, 0);
  if (compare === "semana") previousFrom.setDate(previousFrom.getDate() - 6);
  if (compare === "mes") previousFrom.setDate(1);
  const [currentAgg, previousAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { tenantId, saleDate: { gte: current.from, lte: current.to } },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.sale.aggregate({
      where: { tenantId, saleDate: { gte: previousFrom, lte: previousTo } },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
  ]);
  const actual = asNumber(currentAgg._sum.totalAmount);
  const anterior = asNumber(previousAgg._sum.totalAmount);
  return {
    rows: [
      {
        periodo: compare,
        ventasActual: currentAgg._count.id,
        ingresosActual: actual,
        ventasAnterior: previousAgg._count.id,
        ingresosAnterior: anterior,
        diferencia: actual - anterior,
      },
    ],
  };
}

export async function cotizacionesPorVencer(tenantId: string): Promise<NoaQueryResult> {
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const quotes = await prisma.quote.findMany({
    where: { tenantId, status: { in: ["DRAFT", "SENT"] }, validUntil: { gte: now, lte: soon } },
    select: { quoteNumber: true, customerName: true, totalAmount: true, status: true, validUntil: true },
    orderBy: { validUntil: "asc" },
    take: MAX_ROWS,
  });
  return {
    rows: quotes.map((quote) => ({
      cotizacion: quote.quoteNumber,
      cliente: quote.customerName || "Sin cliente",
      total: asNumber(quote.totalAmount),
      estado: quote.status,
      vence: quote.validUntil.toISOString(),
    })),
  };
}

export async function gastosVsIngresos(tenantId: string, params: NoaIntentParams): Promise<NoaQueryResult> {
  return resumenNegocio(tenantId, params);
}

export async function infoNegocio(tenantId: string): Promise<NoaQueryResult> {
  const [settings, tenant, arcaConfig] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessName: true, plan: true, active: true } }),
    prisma.tenantARCAConfig.findUnique({ where: { tenantId }, select: { cuit: true, puntoVenta: true, condicionIVA: true, ambiente: true } }),
  ]);
  return {
    rows: [
      {
        negocio: settings?.businessName ?? tenant?.businessName ?? "SOLVEN",
        telefono: settings?.phone ?? "",
        email: settings?.email ?? "",
        direccion: settings?.address ?? "",
        moneda: settings?.currency ?? "ARS",
        arcaActiva: Boolean(settings?.arcaEnabled && arcaConfig),
        puntoVenta: arcaConfig?.puntoVenta ?? null,
        plan: tenant?.plan ?? null,
        activo: tenant?.active ?? null,
      },
    ],
  };
}

export async function sesionesCajaAnteriores(tenantId: string): Promise<NoaQueryResult> {
  const sessions = await prisma.cashRegisterSession.findMany({
    where: { tenantId, status: "CLOSED" },
    select: {
      cashierName: true,
      branchName: true,
      openedAt: true,
      closedAt: true,
      openingAmount: true,
      closingAmount: true,
      expectedAmount: true,
      difference: true,
    },
    orderBy: { closedAt: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: sessions.map((session) => ({
      cajero: session.cashierName,
      sucursal: session.branchName,
      apertura: session.openedAt.toISOString(),
      cierre: session.closedAt?.toISOString() ?? null,
      montoInicial: asNumber(session.openingAmount),
      montoCierre: asNumber(session.closingAmount),
      esperado: asNumber(session.expectedAmount),
      diferencia: asNumber(session.difference),
    })),
  };
}

export async function productoSinMovimiento(tenantId: string): Promise<NoaQueryResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      saleItems: { none: { sale: { saleDate: { gte: cutoff } } } },
    },
    select: { name: true, productCode: true, stock: true, salePrice: true },
    orderBy: { name: "asc" },
    take: MAX_ROWS,
  });
  return {
    rows: products.map((product) => ({
      producto: product.name,
      codigo: product.productCode,
      stock: product.stock,
      precio: asNumber(product.salePrice),
      diasSinVenta: 30,
    })),
  };
}

export async function usuariosRoles(tenantId: string): Promise<NoaQueryResult> {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { name: true, email: true, userCode: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: users.map((user) => ({
      usuario: user.name || user.email,
      email: user.email,
      codigo: user.userCode,
      rol: user.role,
      creado: user.createdAt.toISOString(),
    })),
  };
}

export async function subscriptionStatus(tenantId: string): Promise<NoaQueryResult> {
  const subscription = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!subscription) return { rows: [{ estado: "TRIAL", detalle: "Sin suscripcion registrada" }] };
  return {
    rows: [
      {
        estado: subscription.status,
        pruebaHasta: subscription.trialEndsAt?.toISOString() ?? null,
        periodoHasta: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelada: subscription.cancelledAt?.toISOString() ?? null,
      },
    ],
  };
}

export async function arcaConfig(tenantId: string): Promise<NoaQueryResult> {
  const [settings, config] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { tenantId } }),
    prisma.tenantARCAConfig.findUnique({ where: { tenantId } }),
  ]);
  return {
    rows: [
      {
        arcaActiva: Boolean(settings?.arcaEnabled && config),
        cuit: config?.cuit ?? null,
        puntoVenta: config?.puntoVenta ?? null,
        condicionIVA: config?.condicionIVA ?? null,
        ambiente: config?.ambiente ?? null,
        ticketDisponible: true,
      },
    ],
  };
}

export async function categorias(tenantId: string): Promise<NoaQueryResult> {
  const categories = await prisma.category.findMany({
    where: { tenantId },
    select: { name: true, subcategories: { select: { name: true } }, products: { select: { id: true } } },
    orderBy: { name: "asc" },
    take: MAX_ROWS,
  });
  return {
    rows: categories.map((category) => ({
      categoria: category.name,
      subcategorias: category.subcategories.map((sub) => sub.name).join(", "),
      productos: category.products.length,
    })),
  };
}

export async function auditLogs(tenantId: string): Promise<NoaQueryResult> {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId },
    select: { action: true, entityType: true, entityId: true, userCode: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });
  return {
    rows: logs.map((log) => ({
      accion: log.action,
      entidad: log.entityType,
      entidadId: log.entityId,
      usuario: log.userCode,
      fecha: log.createdAt.toISOString(),
    })),
  };
}

export async function registrarConsulta(tenantId: string, question: string) {
  await prisma.helpQuery.create({ data: { tenantId, question: question.slice(0, 500) } });
}

export async function executeNoaQuery(
  tenantId: string,
  intent: NoaIntentName,
  params: NoaIntentParams
): Promise<NoaQueryResult> {
  switch (intent) {
    case "buscar_ventas":
      return buscarVentas(tenantId, params);
    case "buscar_clientes":
      return buscarClientes(tenantId, params);
    case "ver_deuda_cliente":
      return verDeudaCliente(tenantId, params);
    case "buscar_productos":
      return buscarProductos(tenantId, params);
    case "productos_bajo_stock":
      return productosBajoStock(tenantId);
    case "resumen_negocio":
      return resumenNegocio(tenantId, params);
    case "estado_caja":
      return estadoCaja(tenantId);
    case "buscar_cotizaciones":
      return buscarCotizaciones(tenantId, params);
    case "ver_gastos":
      return verGastos(tenantId, params);
    case "movimientos_caja":
      return movimientosCaja(tenantId, params);
    case "productos_mas_vendidos":
      return productosMasVendidos(tenantId, params);
    case "clientes_con_deuda":
      return clientesConDeuda(tenantId);
    case "buscar_servicios":
      return buscarServicios(tenantId, params);
    case "ver_promos_activas":
      return verPromosActivas(tenantId);
    case "historial_cliente":
      return historialCliente(tenantId, params);
    case "buscar_devoluciones":
      return buscarDevoluciones(tenantId, params);
    case "movimientos_inventario":
      return movimientosInventario(tenantId, params);
    case "detalle_venta":
      return detalleVenta(tenantId, params);
    case "comparar_periodos":
      return compararPeriodos(tenantId, params);
    case "cotizaciones_por_vencer":
      return cotizacionesPorVencer(tenantId);
    case "gastos_vs_ingresos":
      return gastosVsIngresos(tenantId, params);
    case "info_negocio":
      return infoNegocio(tenantId);
    case "sesiones_caja_anteriores":
      return sesionesCajaAnteriores(tenantId);
    case "producto_sin_movimiento":
      return productoSinMovimiento(tenantId);
    case "usuarios_roles":
      return usuariosRoles(tenantId);
    case "subscription_status":
      return subscriptionStatus(tenantId);
    case "arca_config":
      return arcaConfig(tenantId);
    case "categorias":
      return categorias(tenantId);
    case "audit_logs":
      return auditLogs(tenantId);
  }
}
