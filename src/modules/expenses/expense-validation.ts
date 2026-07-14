const MAX_RECEIPT_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024 * 4) / 3) + 100;

export type CreateExpenseInput = {
  amount: number;
  category: string;
  description: string;
  receiptUrl?: string | null;
  supplierId?: string | null;
};

export type ValidatedExpenseInput = {
  amount: number;
  category: string;
  description: string;
  receiptUrl: string | null;
  supplierId: string | null;
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

  const receiptUrl =
    typeof expenseInput.receiptUrl === "string" && expenseInput.receiptUrl.length > 0
      ? expenseInput.receiptUrl
      : null;

  if (receiptUrl !== null) {
    const isDataUrl = /^data:(image\/[a-zA-Z+]+|application\/pdf);base64,/.test(receiptUrl);
    if (!isDataUrl) {
      validationErrors.push("Expense receipt must be a valid image or PDF data URL.");
    } else if (receiptUrl.length > MAX_RECEIPT_BASE64_LENGTH) {
      validationErrors.push("Expense receipt must be smaller than 2MB.");
    }
  }

  const supplierId =
    typeof expenseInput.supplierId === "string" && expenseInput.supplierId.trim().length > 0
      ? expenseInput.supplierId.trim()
      : null;

  if (validationErrors.length > 0) {
    throw new ExpenseValidationError(validationErrors);
  }

  return {
    amount: expenseInput.amount,
    category,
    description,
    receiptUrl,
    supplierId
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
