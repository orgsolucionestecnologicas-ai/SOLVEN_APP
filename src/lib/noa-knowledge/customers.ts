import type { KnowledgeEntry } from "./types";

export const customersEntries: KnowledgeEntry[] = [
  {
    id: "customers-create",
    section: "customers",
    route: "/customers/new",
    title: "Crear cliente",
    keywords: ["cliente", "nuevo cliente", "telefono", "email", "alta"],
    answer:
      "Clientes guarda nombre, telefono, email y codigo. Sirve para historial, ventas a credito y pagos de deuda.",
    steps: ["Ir a Clientes", "Nuevo cliente", "Completar nombre y datos opcionales", "Guardar"],
  },
  {
    id: "customers-debt",
    section: "customers",
    route: "/debts",
    title: "Deudas de clientes",
    keywords: ["deuda", "fiado", "pago", "saldo", "pendiente", "me debe"],
    answer:
      "Las deudas nacen de ventas a credito. Un pago nunca puede superar el saldo pendiente y queda registrado.",
    steps: ["Ir a Clientes o Deudas", "Abrir cliente", "Registrar pago", "Confirmar monto"],
  },
  {
    id: "customers-history",
    section: "customers",
    route: "/customers",
    title: "Historial de compras",
    keywords: ["historial", "compras", "cliente", "frecuencia"],
    answer:
      "La ficha del cliente muestra compras, deuda y datos de contacto para entender su relacion con el negocio.",
    steps: ["Ir a Clientes", "Buscar cliente", "Abrir ficha", "Revisar compras y deuda"],
  },
];
