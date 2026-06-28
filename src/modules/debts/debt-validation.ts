export type CreateDebtInput = {
  customerId: string;
  totalAmount: number;
};

export type ValidatedDebtInput = {
  customerId: string;
  totalAmount: number;
  remainingAmount: number;
};

export class DebtValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "DebtValidationError";
  }
}

export function validateCreateDebtInput(
  debtInput: CreateDebtInput
): ValidatedDebtInput {
  const validationErrors: string[] = [];
  const customerId =
    typeof debtInput.customerId === "string" ? debtInput.customerId.trim() : "";

  if (customerId.length === 0) {
    validationErrors.push("Customer id is required.");
  }

  if (!isValidPositiveNumber(debtInput.totalAmount)) {
    validationErrors.push("Debt total amount must be a positive number.");
  }

  if (validationErrors.length > 0) {
    throw new DebtValidationError(validationErrors);
  }

  return {
    customerId,
    totalAmount: debtInput.totalAmount,
    remainingAmount: debtInput.totalAmount
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
