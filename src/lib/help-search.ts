import { HELP_KNOWLEDGE_BASE, type HelpEntry } from "./help-knowledge-base";

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchHelp(query: string): HelpEntry[] {
  if (!query.trim()) return [];

  const normalized = normalizeText(query);
  const words = normalized.split(" ").filter((w) => w.length > 2);

  if (words.length === 0) return [];

  const scored = HELP_KNOWLEDGE_BASE.map((entry) => {
    const normKeywords = entry.keywords.map(normalizeText);
    const normQuestion = normalizeText(entry.question);
    const normModule = normalizeText(entry.module);

    let score = 0;

    for (const word of words) {
      for (const kw of normKeywords) {
        if (kw === word || kw.includes(word) || word.includes(kw)) {
          score += 3;
        }
      }
      if (normQuestion.includes(word)) {
        score += 2;
      }
      if (normModule.includes(word)) {
        score += 1;
      }
    }

    return { entry, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry }) => entry);
}
