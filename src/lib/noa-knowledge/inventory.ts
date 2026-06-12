import type { KnowledgeEntry } from "./types";

export const inventoryEntries: KnowledgeEntry[] = [
  {
    id: "inventory-entry",
    section: "inventory",
    route: "/inventory/entry",
    title: "Entrada de mercaderia",
    keywords: ["entrada", "reponer", "mercaderia", "compra", "stock"],
    answer:
      "La entrada de mercaderia suma stock y registra un movimiento con stock anterior, nuevo y motivo.",
    steps: ["Ir a Inventario", "Nueva entrada", "Seleccionar producto", "Ingresar cantidad", "Confirmar"],
  },
  {
    id: "inventory-adjust",
    section: "inventory",
    route: "/inventory/adjust",
    title: "Ajuste de stock",
    keywords: ["ajuste", "corregir stock", "conteo", "stock fisico"],
    answer:
      "El ajuste manual se usa cuando el stock real no coincide con SOLVEN. Siempre queda registrado el motivo.",
    steps: ["Ir a Inventario", "Nuevo ajuste", "Elegir producto", "Indicar stock correcto", "Guardar"],
  },
  {
    id: "inventory-movements",
    section: "inventory",
    route: "/inventory",
    title: "Movimientos de inventario",
    keywords: ["movimiento", "historial", "trazabilidad", "sale", "return", "adjustment"],
    answer:
      "Los movimientos explican cada cambio de stock: ventas descuentan, devoluciones reponen, entradas suman y ajustes corrigen.",
    steps: ["Ir a Inventario", "Abrir Movimientos", "Filtrar por producto si hace falta"],
  },
];
