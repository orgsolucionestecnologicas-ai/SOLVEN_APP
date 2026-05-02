export type RegisterDebtPaymentInput = {
  debtId: string;
  amount: number;
};

export type ValidatedDebtPaymentInput = {
  debtId: string;
  amount: number;
};

export class DebtPaymentValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "DebtPaymentValidationError";
  }
}

export function validateRegisterDebtPaymentInput(
  paymentInput: RegisterDebtPaymentInput
): ValidatedDebtPaymentInput {
  const validationErrors: string[] = [];
  const debtId =
    typeof paymentInput.debtId === "string" ? paymentInput.debtId.trim() : "";

  if (debtId.length === 0) {
    validationErrors.push("Debt id is required.");
  }

  if (!isValidPositiveNumber(paymentInput.amount)) {
    validationErrors.push("Debt payment amount must be a positive number.");
  }

  if (validationErrors.length > 0) {
    throw new DebtPaymentValidationError(validationErrors);
  }

  return {
    debtId,
    amount: paymentInput.amount
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
