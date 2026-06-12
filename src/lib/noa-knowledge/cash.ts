import type { KnowledgeEntry } from "./types";

export const cashEntries: KnowledgeEntry[] = [
  {
    id: "cash-open",
    section: "cash",
    route: "/cash-movements",
    title: "Abrir caja",
    keywords: ["abrir caja", "apertura", "turno", "monto inicial"],
    answer:
      "La caja se abre con cajero, sucursal, turno opcional y monto inicial. No puede haber dos sesiones abiertas del mismo tenant.",
    steps: ["Ir a Caja", "Abrir caja", "Ingresar monto inicial", "Confirmar"],
  },
  {
    id: "cash-close",
    section: "cash",
    route: "/cash-movements",
    title: "Cerrar caja",
    keywords: ["cerrar caja", "arqueo", "cuadre", "diferencia", "conteo"],
    answer:
      "El cierre calcula esperado contra efectivo contado. Si hay diferencia, agregas observacion y confirmas el cierre.",
    steps: ["Ir a Caja", "Cerrar sesion", "Contar efectivo", "Revisar diferencia", "Finalizar"],
  },
  {
    id: "cash-problem",
    section: "cash",
    route: "/cash-movements",
    title: "No me deja cerrar caja",
    keywords: ["no me deja cerrar", "error caja", "cerrar caja", "problema"],
    answer:
      "Si no te deja cerrar, revisa que haya una sesion abierta, que el monto contado sea valido y que la conexion responda. Las ventas sin sesion abierta no forman parte del arqueo de una sesion.",
    steps: ["Ir a Caja", "Verificar sesion abierta", "Completar conteo", "Intentar cerrar otra vez"],
  },
];
