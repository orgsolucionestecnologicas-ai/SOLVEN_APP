import type { KnowledgeEntry } from "./types";

export const usersEntries: KnowledgeEntry[] = [
  {
    id: "users-roles",
    section: "users",
    route: "/usuarios",
    title: "Roles y permisos",
    keywords: ["rol", "permisos", "owner", "cashier", "inventory", "readonly"],
    answer:
      "OWNER administra todo. CASHIER vende y gestiona clientes/caja. INVENTORY gestiona productos e inventario. READONLY solo consulta.",
    steps: ["Ir a Usuarios", "Crear o editar usuario", "Elegir rol", "Guardar"],
  },
];
