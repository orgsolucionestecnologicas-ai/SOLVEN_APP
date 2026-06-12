import { detectNoaIntent, type NoaIntentName } from "./noa-intent-engine";
import { formatKnowledgeEntry, navigationFor, searchKnowledge, type NoaNavigation } from "./noa-knowledge";
import { executeNoaQuery, registrarConsulta, type NoaQueryResult } from "./noa-queries";

type NoaAnswerInput = {
  tenantId: string;
  role: string;
  message: string;
  context?: { page?: string };
};

export type NoaAnswer = {
  reply: string;
  data?: NoaQueryResult["rows"];
  navigation?: NoaNavigation;
};

const NAVIGATION_BY_INTENT: Record<NoaIntentName, NoaNavigation> = {
  buscar_ventas: { label: "Ir a ventas", route: "/sales" },
  buscar_clientes: { label: "Ir a clientes", route: "/customers" },
  ver_deuda_cliente: { label: "Ir a deudas", route: "/debts" },
  buscar_productos: { label: "Ir a productos", route: "/products" },
  productos_bajo_stock: { label: "Ir a inventario", route: "/inventory" },
  resumen_negocio: { label: "Ir a reportes", route: "/reports" },
  estado_caja: { label: "Ir a caja", route: "/cash-movements" },
  buscar_cotizaciones: { label: "Ir a cotizaciones", route: "/quotes" },
  ver_gastos: { label: "Ir a gastos", route: "/expenses" },
  movimientos_caja: { label: "Ir a caja", route: "/cash-movements" },
  productos_mas_vendidos: { label: "Ir a reportes", route: "/reports" },
  clientes_con_deuda: { label: "Ir a deudas", route: "/debts" },
  buscar_servicios: { label: "Ir a servicios", route: "/services" },
  ver_promos_activas: { label: "Ir a promociones", route: "/promotions" },
  historial_cliente: { label: "Ir a clientes", route: "/customers" },
  buscar_devoluciones: { label: "Ir a devoluciones", route: "/returns" },
  movimientos_inventario: { label: "Ir a inventario", route: "/inventory" },
  detalle_venta: { label: "Ir a ventas", route: "/sales" },
  comparar_periodos: { label: "Ir a reportes", route: "/reports" },
  cotizaciones_por_vencer: { label: "Ir a cotizaciones", route: "/quotes" },
  gastos_vs_ingresos: { label: "Ir a reportes", route: "/reports" },
  info_negocio: { label: "Ir a configuracion", route: "/settings" },
  sesiones_caja_anteriores: { label: "Ir a caja", route: "/cash-movements" },
  producto_sin_movimiento: { label: "Ir a inventario", route: "/inventory" },
  usuarios_roles: { label: "Ir a usuarios", route: "/usuarios" },
  subscription_status: { label: "Ir a mi cuenta", route: "/cuenta" },
  arca_config: { label: "Ir a configuracion", route: "/settings" },
  categorias: { label: "Ir a inventario", route: "/inventory" },
  audit_logs: { label: "Ir a auditoria", route: "/dashboard" },
};

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | number | boolean | null) {
  if (typeof value !== "string") return String(value ?? "");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR").format(date);
}

function humanValue(key: string, value: string | number | boolean | null) {
  if (value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "si" : "no";
  if (typeof value === "number" && /monto|precio|total|saldo|deuda|ingreso|gasto|balance|apertura|salida|entrada|valor|diferencia|esperado/i.test(key)) {
    return formatARS(value);
  }
  if (/fecha|desde|hasta|vence|cierre|apertura|creado|valida/i.test(key)) return formatDate(value);
  return String(value);
}

function previewRows(rows: NoaQueryResult["rows"]) {
  return rows
    .slice(0, 5)
    .map((row) =>
      Object.entries(row)
        .slice(0, 5)
        .map(([key, value]) => `${key}: ${humanValue(key, value)}`)
        .join(" | ")
    )
    .join("\n");
}

function emptyReply(intent: NoaIntentName) {
  const nav = NAVIGATION_BY_INTENT[intent];
  return `No encontre datos con esos filtros, che. Podes revisar ${nav.label.toLowerCase()} y ajustar busqueda o fechas.`;
}

function dataIntro(intent: NoaIntentName, rows: NoaQueryResult["rows"]) {
  if (intent === "estado_caja" && rows[0]?.cajaAbierta === false) {
    return "No hay caja abierta ahora mismo.";
  }
  if (intent === "arca_config") {
    return "Esto es lo que veo de ARCA. Recorda: ticket siempre disponible; factura solo si hay CAE.";
  }
  if (intent === "usuarios_roles") {
    return "Estos son los usuarios y roles del negocio. OWNER administra todo; CASHIER vende; INVENTORY gestiona stock; READONLY consulta.";
  }
  if (intent === "clientes_con_deuda") return "Estos son los clientes con saldo pendiente:";
  if (intent === "productos_bajo_stock") return "Estos productos necesitan atencion de stock:";
  if (intent === "comparar_periodos") return "Comparativa lista:";
  if (intent === "resumen_negocio" || intent === "gastos_vs_ingresos") return "Resumen del periodo:";
  return "Encontre esto:";
}

function buildDataReply(intent: NoaIntentName, result: NoaQueryResult): NoaAnswer {
  const navigation = NAVIGATION_BY_INTENT[intent];
  if (result.rows.length === 0) {
    return { reply: emptyReply(intent), data: [], navigation };
  }

  const reply = `${dataIntro(intent, result.rows)}\n${previewRows(result.rows)}${
    result.rows.length > 5 ? `\nY ${result.rows.length - 5} resultado(s) mas.` : ""
  }`;
  return { reply, data: result.rows, navigation };
}

function readonlyPrefix(role: string, reply: string) {
  if (role !== "READONLY") return reply;
  return `${reply}\n\nCon tu rol READONLY podes consultar, pero para guardar cambios necesitas permisos de OWNER, CASHIER o INVENTORY segun el modulo.`;
}

export async function answerNoaQuestion(input: NoaAnswerInput): Promise<NoaAnswer> {
  const intent = detectNoaIntent(input.message, input.context);

  if (intent.type === "out_of_scope") {
    return {
      reply: "Eso no es lo mio, che. Preguntame algo de tu negocio o de SOLVEN.",
    };
  }

  if (intent.type === "data") {
    const result = await executeNoaQuery(input.tenantId, intent.name, intent.params);
    const answer = buildDataReply(intent.name, result);
    return { ...answer, reply: readonlyPrefix(input.role, answer.reply) };
  }

  const entry = searchKnowledge(input.message, input.context?.page);
  if (entry) {
    return {
      reply: readonlyPrefix(input.role, formatKnowledgeEntry(entry)),
      navigation: navigationFor(entry.section, `Ir a ${entry.title}`),
    };
  }

  await registrarConsulta(input.tenantId, input.message);
  return {
    reply:
      "No encontre una respuesta exacta, pero te lo deje registrado para revisar. Mientras tanto, proba buscarlo desde Dashboard, Ayuda o el modulo mas cercano segun el tema.",
    navigation: { label: "Ir a ayuda", route: "/ayuda" },
  };
}
