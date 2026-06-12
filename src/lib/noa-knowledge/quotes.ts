import type { KnowledgeEntry } from "./types";

export const quotesEntries: KnowledgeEntry[] = [
  {
    id: "quotes-flow",
    section: "quotes",
    route: "/quotes",
    title: "Flujo de cotizaciones",
    keywords: ["cotizacion", "presupuesto", "draft", "sent", "confirmed", "expired"],
    answer:
      "Una cotizacion puede estar DRAFT, SENT, CONFIRMED, EXPIRED o CANCELLED. Al confirmar, se transforma en venta.",
    steps: ["Ir a Cotizaciones", "Crear presupuesto", "Enviar al cliente", "Confirmar si acepta"],
  },
  {
    id: "quotes-expiring",
    section: "quotes",
    route: "/quotes",
    title: "Cotizaciones por vencer",
    keywords: ["por vencer", "vencida", "valid until", "recordatorio"],
    answer:
      "Las cotizaciones tienen fecha de validez. Las DRAFT o SENT proximas al vencimiento conviene revisarlas y contactar al cliente.",
    steps: ["Ir a Cotizaciones", "Filtrar por estado", "Revisar validas hasta"],
  },
];
