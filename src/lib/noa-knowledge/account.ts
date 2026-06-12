import type { KnowledgeEntry } from "./types";

export const accountEntries: KnowledgeEntry[] = [
  {
    id: "account-subscription",
    section: "account",
    route: "/cuenta",
    title: "Suscripcion",
    keywords: ["suscripcion", "plan", "trial", "rebill", "vencimiento", "pago"],
    answer:
      "Mi cuenta muestra el estado de suscripcion: TRIAL, ACTIVE, PAST_DUE, CANCELLED o EXPIRED, y fechas del periodo.",
    steps: ["Ir a Mi cuenta", "Revisar estado", "Actualizar plan si corresponde"],
  },
];
