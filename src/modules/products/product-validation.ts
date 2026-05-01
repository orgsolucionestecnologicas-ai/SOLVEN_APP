export type CreateProductInput = {
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
};

export type ValidatedProductInput = {
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
};

export class ProductValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "ProductValidationError";
  }
}

export function validateCreateProductInput(
  productInput: CreateProductInput
): ValidatedProductInput {
  const validationErrors: string[] = [];
  const name =
    typeof productInput.name === "string" ? productInput.name.trim() : "";

  if (name.length === 0) {
    validationErrors.push("Product name is required.");
  }

  if (!isValidNonNegativeNumber(productInput.costPrice)) {
    validationErrors.push("Cost price must be a non-negative number.");
  }

  if (!isValidNonNegativeNumber(productInput.salePrice)) {
    validationErrors.push("Sale price must be a non-negative number.");
  }

  if (!Number.isInteger(productInput.stock) || productInput.stock < 0) {
    validationErrors.push("Stock must be a non-negative integer.");
  }

  if (validationErrors.length > 0) {
    throw new ProductValidationError(validationErrors);
  }

  return {
    name,
    costPrice: productInput.costPrice,
    salePrice: productInput.salePrice,
    stock: productInput.stock
  };
}

function isValidNonNegativeNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
