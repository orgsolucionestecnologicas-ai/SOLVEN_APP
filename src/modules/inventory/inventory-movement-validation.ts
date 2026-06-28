export type RecordInventoryMovementInput = {
  productId: string;
  reason: string;
  previousStock: number;
  newStock: number;
  quantityChange: number;
};

export type ValidatedInventoryMovementInput = {
  productId: string;
  reason: string;
  previousStock: number;
  newStock: number;
  quantityChange: number;
};

export class InventoryMovementValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "InventoryMovementValidationError";
  }
}

export function validateRecordInventoryMovementInput(
  movementInput: RecordInventoryMovementInput
): ValidatedInventoryMovementInput {
  const validationErrors: string[] = [];
  const productId =
    typeof movementInput.productId === "string"
      ? movementInput.productId.trim()
      : "";
  const reason =
    typeof movementInput.reason === "string" ? movementInput.reason.trim() : "";

  if (productId.length === 0) {
    validationErrors.push("Product id is required.");
  }

  if (reason.length === 0) {
    validationErrors.push("Inventory movement reason is required.");
  }

  if (!isValidNonNegativeInteger(movementInput.previousStock)) {
    validationErrors.push("Previous stock must be a non-negative integer.");
  }

  if (!isValidNonNegativeInteger(movementInput.newStock)) {
    validationErrors.push("New stock must be a non-negative integer.");
  }

  if (!Number.isInteger(movementInput.quantityChange)) {
    validationErrors.push("Quantity change must be an integer.");
  }

  if (validationErrors.length > 0) {
    throw new InventoryMovementValidationError(validationErrors);
  }

  return {
    productId,
    reason,
    previousStock: movementInput.previousStock,
    newStock: movementInput.newStock,
    quantityChange: movementInput.quantityChange
  };
}

function isValidNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}
