import type { KnowledgeEntry } from "./types";

export const glossaryEntries: KnowledgeEntry[] = [
  {
    id: "glossary-cae",
    section: "glossary",
    route: "/settings",
    title: "CAE",
    keywords: ["cae", "codigo autorizacion", "factura"],
    answer:
      "CAE es el codigo de autorizacion electronico de ARCA. En SOLVEN identifica una factura valida.",
  },
  {
    id: "glossary-arqueo",
    section: "glossary",
    route: "/cash-movements",
    title: "Arqueo",
    keywords: ["arqueo", "cuadre", "diferencia", "caja"],
    answer:
      "Arqueo es comparar efectivo contado contra saldo esperado de caja. La diferencia queda guardada al cerrar.",
  },
  {
    id: "glossary-folio",
    section: "glossary",
    route: "/sales",
    title: "Folio",
    keywords: ["folio", "numero venta", "comprobante"],
    answer:
      "Folio es el numero operativo de una venta o cotizacion para encontrarla rapido en SOLVEN.",
  },
  {
    id: "glossary-tenant",
    section: "glossary",
    route: "/settings",
    title: "Tenant",
    keywords: ["tenant", "negocio", "aislamiento"],
    answer:
      "Tenant es el negocio dentro de SOLVEN. Todas las consultas se filtran por tenantId para evitar datos cruzados.",
  },
];
