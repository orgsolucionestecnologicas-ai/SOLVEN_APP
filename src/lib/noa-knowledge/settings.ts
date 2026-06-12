import type { KnowledgeEntry } from "./types";

export const settingsEntries: KnowledgeEntry[] = [
  {
    id: "settings-business",
    section: "settings",
    route: "/settings",
    title: "Datos del negocio",
    keywords: ["negocio", "direccion", "telefono", "email", "cuit", "moneda"],
    answer:
      "Configuracion guarda nombre, titular, telefono, email, direccion, CUIT, moneda, zona horaria, idioma y formato de fecha.",
    steps: ["Ir a Configuracion", "Editar datos", "Guardar"],
  },
  {
    id: "settings-preferences",
    section: "settings",
    route: "/settings",
    title: "Preferencias",
    keywords: ["impresora", "sonidos", "modo oscuro", "notificaciones"],
    answer:
      "Las preferencias controlan impresora, sonidos, modo oscuro y notificaciones de escritorio.",
    steps: ["Ir a Configuracion", "Cambiar preferencias", "Guardar"],
  },
];
