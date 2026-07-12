export type CreateDebtInput = {
  customerId: string;
  totalAmount: number;
  dueDate?: string | null;
};

export type ValidatedDebtInput = {
  customerId: string;
  totalAmount: number;
  remainingAmount: number;
  dueDate: Date | null;
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

  let dueDate: Date | null = null;
  if (debtInput.dueDate !== undefined && debtInput.dueDate !== null && debtInput.dueDate !== "") {
    const parsedDueDate = new Date(debtInput.dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      validationErrors.push("Debt due date must be a valid date.");
    } else {
      dueDate = parsedDueDate;
    }
  }

  if (validationErrors.length > 0) {
    throw new DebtValidationError(validationErrors);
  }

  return {
    customerId,
    totalAmount: debtInput.totalAmount,
    remainingAmount: debtInput.totalAmount,
    dueDate
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
