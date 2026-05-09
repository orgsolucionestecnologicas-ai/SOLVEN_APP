export type OpenSessionInput = {
  cashierName: string;
  branchName?: string;
  shift?: string;
  openingAmount: number;
  openingNotes?: string;
  openingBreakdown?: unknown;
};

export type ValidatedOpenSessionInput = {
  cashierName: string;
  branchName: string;
  shift?: string;
  openingAmount: number;
  openingNotes?: string;
  openingBreakdown?: unknown;
};

export type CloseSessionInput = {
  closingAmount: number;
  closingNotes?: string;
  closingBreakdown?: unknown;
};

export type ValidatedCloseSessionInput = {
  closingAmount: number;
  closingNotes?: string;
  closingBreakdown?: unknown;
};

export class CashRegisterValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "CashRegisterValidationError";
  }
}

export function validateOpenSession(
  input: OpenSessionInput
): ValidatedOpenSessionInput {
  const errors: string[] = [];

  const cashierName =
    typeof input.cashierName === "string" ? input.cashierName.trim() : "";
  if (cashierName.length === 0) {
    errors.push("El nombre del cajero es requerido.");
  }

  if (
    typeof input.openingAmount !== "number" ||
    !Number.isFinite(input.openingAmount) ||
    input.openingAmount < 0
  ) {
    errors.push("El monto de apertura debe ser un número no negativo.");
  }

  if (errors.length > 0) throw new CashRegisterValidationError(errors);

  const branchName =
    typeof input.branchName === "string" && input.branchName.trim()
      ? input.branchName.trim()
      : "Tienda Principal";

  const result: ValidatedOpenSessionInput = {
    cashierName,
    branchName,
    openingAmount: input.openingAmount
  };

  if (input.shift?.trim()) result.shift = input.shift.trim();
  if (input.openingNotes?.trim()) result.openingNotes = input.openingNotes.trim();
  if (input.openingBreakdown !== undefined)
    result.openingBreakdown = input.openingBreakdown;

  return result;
}

export function validateCloseSession(
  input: CloseSessionInput
): ValidatedCloseSessionInput {
  const errors: string[] = [];

  if (
    typeof input.closingAmount !== "number" ||
    !Number.isFinite(input.closingAmount) ||
    input.closingAmount < 0
  ) {
    errors.push("El monto de cierre debe ser un número no negativo.");
  }

  if (errors.length > 0) throw new CashRegisterValidationError(errors);

  const result: ValidatedCloseSessionInput = {
    closingAmount: input.closingAmount
  };

  if (input.closingNotes?.trim()) result.closingNotes = input.closingNotes.trim();
  if (input.closingBreakdown !== undefined)
    result.closingBreakdown = input.closingBreakdown;

  return result;
}
