import { HELP_KNOWLEDGE_BASE } from "../help-knowledge-base";
import type { KnowledgeEntry } from "./types";

function routeForModule(moduleName: string) {
  const moduleKey = moduleName.toLowerCase();
  if (moduleKey.includes("caja")) return "/cash-movements";
  if (moduleKey.includes("venta")) return "/pos";
  if (moduleKey.includes("producto")) return "/products";
  if (moduleKey.includes("inventario")) return "/inventory";
  if (moduleKey.includes("cliente")) return "/customers";
  if (moduleKey.includes("devolucion")) return "/returns";
  if (moduleKey.includes("promocion")) return "/promotions";
  if (moduleKey.includes("reporte")) return "/reports";
  if (moduleKey.includes("config")) return "/settings";
  if (moduleKey.includes("suscripcion")) return "/cuenta";
  return "/ayuda";
}

export const faqEntries: KnowledgeEntry[] = HELP_KNOWLEDGE_BASE.map((entry) => ({
  id: `faq-${entry.id}`,
  section: entry.module,
  route: routeForModule(entry.module),
  title: entry.question,
  keywords: [...entry.keywords, entry.module],
  answer: [entry.answer, entry.tip].filter(Boolean).join(" "),
  steps: entry.steps,
}));
