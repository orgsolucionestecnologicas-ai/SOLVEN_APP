export type CreateExpenseInput = {
  amount: number;
  category: string;
  description: string;
};

export type ValidatedExpenseInput = {
  amount: number;
  category: string;
  description: string;
};

export class ExpenseValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "ExpenseValidationError";
  }
}

export function validateCreateExpenseInput(
  expenseInput: CreateExpenseInput
): ValidatedExpenseInput {
  const validationErrors: string[] = [];
  const category =
    typeof expenseInput.category === "string"
      ? expenseInput.category.trim()
      : "";
  const description =
    typeof expenseInput.description === "string"
      ? expenseInput.description.trim()
      : "";

  if (!isValidPositiveNumber(expenseInput.amount)) {
    validationErrors.push("Expense amount must be a positive number.");
  }

  if (category.length === 0) {
    validationErrors.push("Expense category is required.");
  }

  if (description.length === 0) {
    validationErrors.push("Expense description is required.");
  }

  if (validationErrors.length > 0) {
    throw new ExpenseValidationError(validationErrors);
  }

  return {
    amount: expenseInput.amount,
    category,
    description
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
