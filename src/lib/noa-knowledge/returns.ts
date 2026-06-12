import type { KnowledgeEntry } from "./types";

export const returnsEntries: KnowledgeEntry[] = [
  {
    id: "returns-process",
    section: "returns",
    route: "/returns",
    title: "Procesar devolucion",
    keywords: ["devolucion", "devolver", "reembolso", "retorno", "venta original"],
    answer:
      "Para una devolucion se busca la venta original, se seleccionan productos y cantidades, y al confirmar se repone stock.",
    steps: ["Ir a Devoluciones", "Buscar la venta", "Elegir items", "Confirmar devolucion"],
  },
  {
    id: "returns-stock",
    section: "returns",
    route: "/returns",
    title: "Impacto en stock",
    keywords: ["stock", "repone", "inventario", "return"],
    answer:
      "Cada devolucion crea trazabilidad sobre la venta y vuelve a sumar al stock del producto devuelto.",
    steps: ["Confirmar devolucion", "Revisar Inventario > Movimientos si necesitas auditar"],
  },
];
