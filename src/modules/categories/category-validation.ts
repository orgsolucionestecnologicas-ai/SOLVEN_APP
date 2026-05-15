export class CategoryValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "CategoryValidationError";
  }
}

export function validateCategoryName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length === 0) {
    throw new CategoryValidationError(["El nombre de la categoría es requerido."]);
  }
  return trimmed;
}

export function validateSubcategoryName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length === 0) {
    throw new CategoryValidationError([
      "El nombre de la subcategoría es requerido."
    ]);
  }
  return trimmed;
}
