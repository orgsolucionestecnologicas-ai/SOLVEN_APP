export const DEBT_PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Otro"
] as const;

export type DebtPaymentMethod = (typeof DEBT_PAYMENT_METHODS)[number];

export type RegisterDebtPaymentInput = {
  debtId: string;
  amount: number;
  method?: string;
};

export type ValidatedDebtPaymentInput = {
  debtId: string;
  amount: number;
  method: DebtPaymentMethod;
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

  const method = paymentInput.method === undefined ? "Efectivo" : paymentInput.method;
  if (!DEBT_PAYMENT_METHODS.includes(method as DebtPaymentMethod)) {
    validationErrors.push("Debt payment method is invalid.");
  }

  if (validationErrors.length > 0) {
    throw new DebtPaymentValidationError(validationErrors);
  }

  return {
    debtId,
    amount: paymentInput.amount,
    method: method as DebtPaymentMethod
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
