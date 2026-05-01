export type AdjustProductStockInput = {
  productId: string;
  newStock: number;
  reason: string;
};

export type ValidatedStockAdjustmentInput = {
  productId: string;
  newStock: number;
  reason: string;
};

export class StockAdjustmentValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "StockAdjustmentValidationError";
  }
}

export function validateAdjustProductStockInput(
  adjustmentInput: AdjustProductStockInput
): ValidatedStockAdjustmentInput {
  const validationErrors: string[] = [];
  const productId =
    typeof adjustmentInput.productId === "string"
      ? adjustmentInput.productId.trim()
      : "";
  const reason =
    typeof adjustmentInput.reason === "string"
      ? adjustmentInput.reason.trim()
      : "";

  if (productId.length === 0) {
    validationErrors.push("Product id is required.");
  }

  if (reason.length === 0) {
    validationErrors.push("Stock adjustment reason is required.");
  }

  if (!Number.isInteger(adjustmentInput.newStock) || adjustmentInput.newStock < 0) {
    validationErrors.push("New stock must be a non-negative integer.");
  }

  if (validationErrors.length > 0) {
    throw new StockAdjustmentValidationError(validationErrors);
  }

  return {
    productId,
    newStock: adjustmentInput.newStock,
    reason
  };
}
