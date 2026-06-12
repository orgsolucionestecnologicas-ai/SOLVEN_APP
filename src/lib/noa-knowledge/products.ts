import type { KnowledgeEntry } from "./types";

export const productsEntries: KnowledgeEntry[] = [
  {
    id: "products-create",
    section: "products",
    route: "/products/new",
    title: "Crear producto",
    keywords: ["nuevo producto", "crear producto", "alta", "precio", "stock", "iva"],
    answer:
      "Un producto pide nombre, codigo opcional, categoria, precio de costo, precio de venta, IVA, stock inicial y stock minimo.",
    steps: ["Ir a Productos", "Nuevo producto", "Completar campos requeridos", "Guardar"],
    roles: "OWNER e INVENTORY gestionan productos.",
  },
  {
    id: "products-edit",
    section: "products",
    route: "/products",
    title: "Editar producto",
    keywords: ["editar producto", "cambiar precio", "codigo", "categoria"],
    answer:
      "La edicion de producto cambia datos comerciales. Para movimientos reales de stock conviene usar Inventario.",
    steps: ["Ir a Productos", "Abrir producto", "Editar campos", "Guardar"],
  },
];
