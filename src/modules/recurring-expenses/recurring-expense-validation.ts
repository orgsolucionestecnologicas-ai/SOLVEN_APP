export const RECURRING_EXPENSE_PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Otro"
] as const;

export type RecurringExpensePaymentMethod = (typeof RECURRING_EXPENSE_PAYMENT_METHODS)[number];

export type CreateRecurringExpenseInput = {
  category: string;
  amount: number;
  description?: string | null;
  dayOfMonth: number;
  method?: string;
};

export type ValidatedRecurringExpenseInput = {
  category: string;
  amount: number;
  description: string | null;
  dayOfMonth: number;
  method: RecurringExpensePaymentMethod;
};

export class RecurringExpenseValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "RecurringExpenseValidationError";
  }
}

export function validateCreateRecurringExpenseInput(
  recurringExpenseInput: CreateRecurringExpenseInput
): ValidatedRecurringExpenseInput {
  const validationErrors: string[] = [];
  const category =
    typeof recurringExpenseInput.category === "string"
      ? recurringExpenseInput.category.trim()
      : "";
  const description =
    typeof recurringExpenseInput.description === "string" &&
    recurringExpenseInput.description.trim().length > 0
      ? recurringExpenseInput.description.trim()
      : null;

  if (category.length === 0) {
    validationErrors.push("La categoría es requerida.");
  }

  if (!isValidPositiveNumber(recurringExpenseInput.amount)) {
    validationErrors.push("El monto debe ser un número mayor a cero.");
  }

  if (
    !Number.isInteger(recurringExpenseInput.dayOfMonth) ||
    recurringExpenseInput.dayOfMonth < 1 ||
    recurringExpenseInput.dayOfMonth > 31
  ) {
    validationErrors.push("El día del mes debe ser un número entre 1 y 31.");
  }

  const method =
    recurringExpenseInput.method === undefined ? "Efectivo" : recurringExpenseInput.method;
  if (!RECURRING_EXPENSE_PAYMENT_METHODS.includes(method as RecurringExpensePaymentMethod)) {
    validationErrors.push("El método de pago del gasto recurrente no es válido.");
  }

  if (validationErrors.length > 0) {
    throw new RecurringExpenseValidationError(validationErrors);
  }

  return {
    category,
    amount: recurringExpenseInput.amount,
    description,
    dayOfMonth: recurringExpenseInput.dayOfMonth,
    method: method as RecurringExpensePaymentMethod
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
