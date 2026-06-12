import { accountEntries } from "./account";
import { arcaEntries } from "./arca";
import { cashEntries } from "./cash";
import { customersEntries } from "./customers";
import { dashboardEntries } from "./dashboard";
import { faqEntries } from "./faq";
import { glossaryEntries } from "./glossary";
import { inventoryEntries } from "./inventory";
import { navigationEntries } from "./navigation";
import { posEntries } from "./pos";
import { productsEntries } from "./products";
import { promotionsEntries } from "./promotions";
import { quotesEntries } from "./quotes";
import { reportsEntries } from "./reports";
import { returnsEntries } from "./returns";
import { servicesEntries } from "./services";
import { settingsEntries } from "./settings";
import type { KnowledgeEntry, NoaNavigation } from "./types";
import { usersEntries } from "./users";

export type { KnowledgeEntry, NoaNavigation };

export const NOA_KNOWLEDGE: KnowledgeEntry[] = [
  ...navigationEntries,
  ...dashboardEntries,
  ...posEntries,
  ...returnsEntries,
  ...productsEntries,
  ...servicesEntries,
  ...inventoryEntries,
  ...customersEntries,
  ...cashEntries,
  ...quotesEntries,
  ...reportsEntries,
  ...promotionsEntries,
  ...settingsEntries,
  ...usersEntries,
  ...accountEntries,
  ...arcaEntries,
  ...glossaryEntries,
  ...faqEntries,
];

const ROUTES_BY_SECTION = new Map(NOA_KNOWLEDGE.map((entry) => [entry.section, entry.route]));

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/$.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreEntry(entry: KnowledgeEntry, normalizedQuestion: string) {
  const words = normalizedQuestion.split(" ").filter((word) => word.length > 2);
  const haystack = normalizeText(
    [entry.section, entry.title, entry.answer, entry.keywords.join(" "), entry.steps?.join(" ")]
      .filter(Boolean)
      .join(" ")
  );

  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

export function searchKnowledge(question: string, page?: string) {
  const normalized = normalizeText(question);
  const scored = NOA_KNOWLEDGE.map((entry) => {
    const pageBoost = page && entry.route.includes(page) ? 2 : 0;
    return { entry, score: scoreEntry(entry, normalized) + pageBoost };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.entry ?? null;
}

export function navigationFor(section: string, label?: string): NoaNavigation | undefined {
  const route = ROUTES_BY_SECTION.get(section);
  if (!route) return undefined;
  return { label: label ?? `Ir a ${section}`, route };
}

export function formatKnowledgeEntry(entry: KnowledgeEntry) {
  const steps = entry.steps?.length ? `\n\nPasos:\n${entry.steps.map((step) => `- ${step}`).join("\n")}` : "";
  const roles = entry.roles ? `\n\nPermisos: ${entry.roles}` : "";
  return `${entry.answer}${steps}${roles}`;
}
