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

// Palabras vacías que no aportan al score
const STOP_WORDS = new Set([
  "como", "que", "para", "una", "uno", "los", "las", "del", "con",
  "por", "hay", "hacer", "hago", "puedo", "puede", "quiero", "ver",
  "esta", "esta", "ese", "eso", "esa", "son", "ser", "tengo", "tiene",
]);

export interface SearchResult {
  entry: HelpEntry;
  score: number;
  confidence: "high" | "medium" | "low";
}

export function searchHelp(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const normalized = normalizeText(query);
  const allWords = normalized.split(" ").filter((w) => w.length > 1);
  // Palabras con significado (sin stop words y de longitud razonable)
  const words = allWords.filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (words.length === 0 && allWords.length === 0) return [];

  // Si todas las palabras son stop words, usar todas
  const searchWords = words.length > 0 ? words : allWords;

  const scored = HELP_KNOWLEDGE_BASE.map((entry) => {
    const normKeywords = entry.keywords.map(normalizeText);
    const normQuestion = normalizeText(entry.question);
    const normAnswer = normalizeText(entry.answer);
    const normModule = normalizeText(entry.module);
    const normSteps = (entry.steps ?? []).map(normalizeText).join(" ");

    let score = 0;

    // Frase completa normalizada dentro de la pregunta → bonus grande
    if (normQuestion.includes(normalized)) score += 15;

    for (const word of searchWords) {
      // Keyword exacta
      for (const kw of normKeywords) {
        if (kw === word) {
          score += 5;
        } else if (kw.startsWith(word) || word.startsWith(kw)) {
          score += 3;
        } else if (kw.includes(word) || word.includes(kw)) {
          score += 2;
        }
      }

      // En la pregunta
      if (normQuestion.includes(word)) score += 3;

      // En la respuesta o pasos
      if (normAnswer.includes(word)) score += 1;
      if (normSteps.includes(word)) score += 1;

      // En el módulo
      if (normModule.includes(word)) score += 2;
    }

    // Bonus si el módulo coincide exactamente con alguna palabra de búsqueda
    if (searchWords.includes(normModule)) score += 4;

    return { entry, score };
  });

  const maxScore = Math.max(...scored.map((s) => s.score), 1);

  const results = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry, score }) => ({
      entry,
      score,
      confidence:
        score / maxScore >= 0.75
          ? ("high" as const)
          : score / maxScore >= 0.4
          ? ("medium" as const)
          : ("low" as const),
    }));

  return results;
}
