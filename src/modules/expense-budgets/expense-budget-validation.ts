export type UpsertExpenseBudgetInput = {
  category: string;
  monthlyLimit: number;
};

export type ValidatedExpenseBudgetInput = {
  category: string;
  monthlyLimit: number;
};

export class ExpenseBudgetValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "ExpenseBudgetValidationError";
  }
}

export function validateUpsertExpenseBudgetInput(
  budgetInput: UpsertExpenseBudgetInput
): ValidatedExpenseBudgetInput {
  const validationErrors: string[] = [];
  const category =
    typeof budgetInput.category === "string" ? budgetInput.category.trim() : "";

  if (category.length === 0) {
    validationErrors.push("La categoría es requerida.");
  }

  if (!isValidPositiveNumber(budgetInput.monthlyLimit)) {
    validationErrors.push("El límite mensual debe ser un número mayor a cero.");
  }

  if (validationErrors.length > 0) {
    throw new ExpenseBudgetValidationError(validationErrors);
  }

  return {
    category,
    monthlyLimit: budgetInput.monthlyLimit
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
