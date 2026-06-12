import type { KnowledgeEntry } from "./types";

export const reportsEntries: KnowledgeEntry[] = [
  {
    id: "reports-sales",
    section: "reports",
    route: "/reports",
    title: "Reporte de ventas",
    keywords: ["reporte", "ventas", "ingresos", "periodo", "mes", "hoy"],
    answer:
      "Reportes permite ver ventas e ingresos por periodo, comparar resultados y detectar productos fuertes.",
    steps: ["Ir a Reportes", "Elegir periodo", "Revisar ventas e ingresos"],
  },
  {
    id: "reports-products",
    section: "reports",
    route: "/reports",
    title: "Productos mas vendidos",
    keywords: ["top productos", "mas vendidos", "ranking", "unidades"],
    answer:
      "El ranking de productos muestra unidades e ingresos para decidir reposicion y promociones.",
    steps: ["Ir a Reportes", "Abrir productos", "Comparar unidades e ingresos"],
  },
];
