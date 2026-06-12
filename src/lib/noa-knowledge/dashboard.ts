import type { KnowledgeEntry } from "./types";

export const dashboardEntries: KnowledgeEntry[] = [
  {
    id: "dashboard-summary",
    section: "dashboard",
    route: "/dashboard",
    title: "Resumen del negocio",
    keywords: ["dashboard", "inicio", "resumen", "ventas", "ingresos", "alertas"],
    answer:
      "El Dashboard resume ventas recientes, ingresos, stock bajo y accesos a flujos frecuentes. Es la primera parada para saber como viene el negocio.",
    steps: ["Abrir Dashboard", "Mirar tarjetas superiores", "Entrar al modulo relacionado si necesitas detalle"],
  },
  {
    id: "dashboard-stock",
    section: "dashboard",
    route: "/dashboard",
    title: "Alertas de stock",
    keywords: ["stock bajo", "alerta", "sin stock", "reponer"],
    answer:
      "Las alertas de stock muestran productos con stock igual o menor al minimo. Para operar el detalle, anda a Inventario.",
    steps: ["Abrir Dashboard", "Revisar alertas", "Ir a Inventario para ajustar o reponer"],
  },
];
