export type CashMovementType = "IN" | "OUT";

export type CreateCashMovementInput = {
  type: CashMovementType;
  amount: number;
  source: string;
  referenceId: string;
  note?: string | null;
};

export type ValidatedCashMovementInput = {
  type: CashMovementType;
  amount: number;
  source: string;
  referenceId: string;
  note: string | null;
};

export class CashMovementValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "CashMovementValidationError";
  }
}

export function validateCreateCashMovementInput(
  movementInput: CreateCashMovementInput
): ValidatedCashMovementInput {
  const validationErrors: string[] = [];
  const source =
    typeof movementInput.source === "string" ? movementInput.source.trim() : "";
  const referenceId =
    typeof movementInput.referenceId === "string"
      ? movementInput.referenceId.trim()
      : "";
  const note =
    typeof movementInput.note === "string" ? movementInput.note.trim() : "";

  if (movementInput.type !== "IN" && movementInput.type !== "OUT") {
    validationErrors.push("Cash movement type must be IN or OUT.");
  }

  if (!isValidPositiveNumber(movementInput.amount)) {
    validationErrors.push("Cash movement amount must be a positive number.");
  }

  if (source.length === 0) {
    validationErrors.push("Cash movement source is required.");
  }

  if (referenceId.length === 0) {
    validationErrors.push("Cash movement reference id is required.");
  }

  if (source === "MANUAL" && note.length === 0) {
    validationErrors.push("Cash movement note is required for manual movements.");
  }

  if (validationErrors.length > 0) {
    throw new CashMovementValidationError(validationErrors);
  }

  return {
    type: movementInput.type,
    amount: movementInput.amount,
    source,
    referenceId,
    note: note.length > 0 ? note : null
  };
}

function isValidPositiveNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
