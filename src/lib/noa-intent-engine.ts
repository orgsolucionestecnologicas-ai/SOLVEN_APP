import { normalizeText } from "./noa-knowledge";

export type NoaIntentName =
  | "buscar_ventas"
  | "buscar_clientes"
  | "ver_deuda_cliente"
  | "buscar_productos"
  | "productos_bajo_stock"
  | "resumen_negocio"
  | "estado_caja"
  | "buscar_cotizaciones"
  | "ver_gastos"
  | "movimientos_caja"
  | "productos_mas_vendidos"
  | "clientes_con_deuda"
  | "buscar_servicios"
  | "ver_promos_activas"
  | "historial_cliente"
  | "buscar_devoluciones"
  | "movimientos_inventario"
  | "detalle_venta"
  | "comparar_periodos"
  | "cotizaciones_por_vencer"
  | "gastos_vs_ingresos"
  | "info_negocio"
  | "sesiones_caja_anteriores"
  | "producto_sin_movimiento"
  | "usuarios_roles"
  | "subscription_status"
  | "arca_config"
  | "categorias"
  | "audit_logs";

export type NoaIntent =
  | { type: "data"; name: NoaIntentName; params: NoaIntentParams }
  | { type: "guide"; params: NoaIntentParams }
  | { type: "out_of_scope"; params: NoaIntentParams }
  | { type: "unknown"; params: NoaIntentParams };

export type NoaIntentParams = {
  query?: string;
  nombre?: string;
  folio?: number;
  periodo?: "dia" | "semana" | "mes";
  compare?: "dia" | "semana" | "mes";
  dateFrom?: string;
  dateTo?: string;
  status?: "DRAFT" | "SENT" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  days?: number;
  limit?: number;
  amountMin?: number;
  amountMax?: number;
  receiptType?: "TICKET" | "INVOICE";
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const OUT_OF_SCOPE = [
  "clima",
  "futbol",
  "politica",
  "receta",
  "chiste",
  "programame",
  "codigo externo",
  "noticia",
];

const GUIDE_WORDS = [
  "como",
  "donde",
  "que es",
  "para que",
  "no me deja",
  "problema",
  "error",
  "ayuda",
  "explicame",
];

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function detectDateRange(normalized: string) {
  const today = startOfDay(new Date());
  if (normalized.includes("ayer")) {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    return { dateFrom: iso(date), dateTo: iso(date), periodo: "dia" as const };
  }
  if (normalized.includes("hoy") || normalized.includes("del dia")) {
    return { dateFrom: iso(today), dateTo: iso(today), periodo: "dia" as const };
  }
  if (normalized.includes("semana")) {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { dateFrom: iso(from), dateTo: iso(endOfDay(new Date())), periodo: "semana" as const };
  }
  if (normalized.includes("mes pasado")) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dateFrom: iso(from), dateTo: iso(to), periodo: "mes" as const };
  }
  if (normalized.includes("mes")) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: iso(from), dateTo: iso(endOfDay(new Date())), periodo: "mes" as const };
  }

  const now = new Date();
  const mentionedMonths = MONTHS.map((month, index) => ({ month, index })).filter((item) =>
    normalized.includes(item.month)
  );
  if (mentionedMonths.length > 0) {
    const first = mentionedMonths[0].index;
    const last = mentionedMonths[mentionedMonths.length - 1].index;
    const from = new Date(now.getFullYear(), first, 1);
    const to = new Date(now.getFullYear(), last + 1, 0);
    return { dateFrom: iso(from), dateTo: iso(to) };
  }

  const dateMatch = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const yearRaw = dateMatch[3] ? Number(dateMatch[3]) : now.getFullYear();
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) return { dateFrom: iso(date), dateTo: iso(date) };
  }

  return {};
}

function extractFolio(normalized: string) {
  const match = normalized.match(/\b(?:folio|venta|factura|ticket|cotizacion)?\s*0*(\d{1,8})\b/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function extractName(message: string, normalized: string) {
  const patterns = [
    /(?:de|del|a|para|cliente)\s+([a-z0-9\s.-]{3,50})/i,
    /(?:busca|buscame|buscar)\s+([a-z0-9\s.-]{3,50})/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(/\b(hoy|ayer|mayo|junio|julio|agosto|mes|semana|factura|venta|ticket)\b/g, "")
        .trim();
    }
  }

  const capitalized = message.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})?\b/);
  return capitalized?.[0]?.trim();
}

function hasAny(normalized: string, words: string[]) {
  return words.some((word) => normalized.includes(word));
}

function baseParams(message: string, normalized: string): NoaIntentParams {
  const params: NoaIntentParams = {
    ...detectDateRange(normalized),
  };
  const folio = extractFolio(normalized);
  if (folio) params.folio = folio;
  const name = extractName(message, normalized);
  if (name) {
    params.query = name;
    params.nombre = name;
  }
  if (normalized.includes("factura")) params.receiptType = "INVOICE";
  if (normalized.includes("ticket")) params.receiptType = "TICKET";
  if (normalized.includes("borrador")) params.status = "DRAFT";
  if (normalized.includes("enviada")) params.status = "SENT";
  if (normalized.includes("confirmada")) params.status = "CONFIRMED";
  if (normalized.includes("vencida")) params.status = "EXPIRED";
  if (normalized.includes("cancelada")) params.status = "CANCELLED";
  return params;
}

export function detectNoaIntent(message: string, context?: { page?: string }): NoaIntent {
  const normalized = normalizeText(message);
  const params = baseParams(message, normalized);
  const page = context?.page ? normalizeText(context.page) : "";

  if (hasAny(normalized, OUT_OF_SCOPE)) return { type: "out_of_scope", params };

  if (hasAny(normalized, ["quien me debe", "deudores", "me debe plata", "clientes con deuda"])) {
    return { type: "data", name: "clientes_con_deuda", params };
  }
  if (hasAny(normalized, ["cuanto me debe", "deuda de", "debe ", "fiado de"])) {
    return { type: "data", name: "ver_deuda_cliente", params };
  }
  if (hasAny(normalized, ["no tiene stock", "sin stock", "stock bajo", "reponer", "me falta"])) {
    return { type: "data", name: "productos_bajo_stock", params };
  }
  if (hasAny(normalized, ["plata hay en caja", "estado de caja", "caja actual", "saldo de caja", "arqueo"])) {
    return { type: "data", name: "estado_caja", params };
  }
  if (hasAny(normalized, ["movimientos de caja", "entro a caja", "salio de caja", "retiros"])) {
    return { type: "data", name: "movimientos_caja", params };
  }
  if (hasAny(normalized, ["mas vendidos", "top productos", "ranking"])) {
    return { type: "data", name: "productos_mas_vendidos", params: { ...params, periodo: params.periodo ?? "mes" } };
  }
  if (hasAny(normalized, ["mes vs", "hoy vs", "comparar", "contra el anterior", "vs el anterior"])) {
    return { type: "data", name: "comparar_periodos", params: { ...params, compare: params.periodo ?? "mes" } };
  }
  if (hasAny(normalized, ["que llevo", "detalle", "items", "productos de la venta"])) {
    return { type: "data", name: "detalle_venta", params };
  }
  if (hasAny(normalized, ["gastos vs ingresos", "balance", "ganancia", "ingresos y gastos"])) {
    return { type: "data", name: "gastos_vs_ingresos", params };
  }
  if (hasAny(normalized, ["que vendi", "ventas", "vendi hoy", "factura", "ticket"]) || page === "sales") {
    return { type: "data", name: "buscar_ventas", params };
  }
  if (hasAny(normalized, ["cliente", "telefono", "email"]) || page === "customers") {
    if (hasAny(normalized, ["historial", "compras", "frecuencia"])) {
      return { type: "data", name: "historial_cliente", params };
    }
    return { type: "data", name: "buscar_clientes", params };
  }
  if (hasAny(normalized, ["producto", "precio", "codigo", "iva", "stock"]) || page === "products") {
    if (hasAny(normalized, ["sin movimiento", "no se vende", "no vendi"])) {
      return { type: "data", name: "producto_sin_movimiento", params };
    }
    return { type: "data", name: "buscar_productos", params };
  }
  if (hasAny(normalized, ["cotizacion", "presupuesto"]) || page === "quotes") {
    if (hasAny(normalized, ["por vencer", "vencen pronto", "proximas a vencer"])) {
      return { type: "data", name: "cotizaciones_por_vencer", params };
    }
    return { type: "data", name: "buscar_cotizaciones", params };
  }
  if (hasAny(normalized, ["gasto", "egreso"])) return { type: "data", name: "ver_gastos", params };
  if (hasAny(normalized, ["servicio"])) return { type: "data", name: "buscar_servicios", params };
  if (hasAny(normalized, ["promo", "promocion", "descuento"])) {
    return { type: "data", name: "ver_promos_activas", params };
  }
  if (hasAny(normalized, ["devolucion", "devolver"])) {
    return { type: "data", name: "buscar_devoluciones", params };
  }
  if (hasAny(normalized, ["movimientos de inventario", "historial de stock", "ajustes de stock"])) {
    return { type: "data", name: "movimientos_inventario", params };
  }
  if (hasAny(normalized, ["datos del negocio", "info negocio", "configuracion", "direccion"])) {
    return { type: "data", name: "info_negocio", params };
  }
  if (hasAny(normalized, ["sesiones de caja", "cierres anteriores", "historial de caja"])) {
    return { type: "data", name: "sesiones_caja_anteriores", params };
  }
  if (hasAny(normalized, ["usuarios", "roles", "permisos"])) return { type: "data", name: "usuarios_roles", params };
  if (hasAny(normalized, ["suscripcion", "plan", "rebill", "trial"])) {
    return { type: "data", name: "subscription_status", params };
  }
  if (hasAny(normalized, ["arca", "cae", "facturacion electronica"])) {
    return { type: "data", name: "arca_config", params };
  }
  if (hasAny(normalized, ["categoria", "subcategoria"])) return { type: "data", name: "categorias", params };
  if (hasAny(normalized, ["auditoria", "audit", "registro de acciones"])) {
    return { type: "data", name: "audit_logs", params };
  }
  if (hasAny(normalized, GUIDE_WORDS)) return { type: "guide", params };
  return { type: "unknown", params };
}
