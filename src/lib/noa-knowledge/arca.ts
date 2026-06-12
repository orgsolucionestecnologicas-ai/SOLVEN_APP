import type { KnowledgeEntry } from "./types";

export const arcaEntries: KnowledgeEntry[] = [
  {
    id: "arca-cae",
    section: "arca",
    route: "/settings",
    title: "CAE y ARCA",
    keywords: ["arca", "cae", "factura", "ticket", "afip", "electronica"],
    answer:
      "ARCA es opcional por tenant y por venta. Ticket siempre funciona. Sale.cae vacio significa ticket; con CAE significa factura emitida.",
    steps: ["Ir a Configuracion", "Configurar ARCA", "En POS elegir factura solo cuando corresponda"],
  },
  {
    id: "arca-config",
    section: "arca",
    route: "/settings",
    title: "Configurar ARCA",
    keywords: ["cuit", "punto venta", "certificado", "clave privada", "ambiente"],
    answer:
      "ARCA usa CUIT, punto de venta, condicion IVA, certificado, clave privada y ambiente homo/prod. SOLVEN funciona sin ARCA activado.",
    steps: ["Ir a Configuracion", "Completar datos ARCA", "Guardar y probar emision"],
  },
];
