import type { KnowledgeEntry } from "./types";

export const servicesEntries: KnowledgeEntry[] = [
  {
    id: "services-manage",
    section: "services",
    route: "/services",
    title: "Gestionar servicios",
    keywords: ["servicio", "crear servicio", "precio", "descripcion", "activo"],
    answer:
      "Los servicios son items vendibles sin stock fisico. Tienen codigo, nombre, descripcion, precio y estado activo.",
    steps: ["Ir a Servicios", "Crear o editar servicio", "Usarlo desde POS"],
  },
];
