import type { KnowledgeEntry } from "./types";

export const promotionsEntries: KnowledgeEntry[] = [
  {
    id: "promotions-create",
    section: "promotions",
    route: "/promotions",
    title: "Crear promocion",
    keywords: ["promocion", "promo", "descuento", "2x1", "codigo", "vigencia"],
    answer:
      "Promociones admite porcentaje, monto fijo, 2x1, 3x2, compra minima, precio especial y combos.",
    steps: ["Ir a Promociones", "Nueva promocion", "Elegir tipo", "Definir vigencia", "Guardar"],
  },
  {
    id: "promotions-activation",
    section: "promotions",
    route: "/promotions",
    title: "Activacion de promo",
    keywords: ["manual", "automatico", "codigo", "activar", "desactivar"],
    answer:
      "Una promo puede activarse automaticamente, por codigo manual o ambas. Solo aplica si esta activa y dentro de vigencia.",
    steps: ["Abrir Promociones", "Revisar activacion", "Activar o pausar"],
  },
];
