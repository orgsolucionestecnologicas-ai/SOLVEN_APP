export const PRODUCT_CATEGORIES = [
  "Alimentos",
  "Bebidas",
  "Lácteos",
  "Limpieza",
  "Cuidado Personal",
  "Hogar",
  "Panadería",
  "Snacks",
  "Otros",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type CreateProductInput = {
  name: string;
  categoryName?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
};

export type ValidatedProductInput = {
  name: string;
  categoryName: string;
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

  const categoryName =
    typeof productInput.categoryName === "string" &&
    (PRODUCT_CATEGORIES as readonly string[]).includes(productInput.categoryName)
      ? productInput.categoryName
      : "Otros";

  if (validationErrors.length > 0) {
    throw new ProductValidationError(validationErrors);
  }

  return {
    name,
    categoryName,
    costPrice: productInput.costPrice,
    salePrice: productInput.salePrice,
    stock: productInput.stock
  };
}

function isValidNonNegativeNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export type UpdateProductInput = {
  name?: string;
  categoryName?: string;
  costPrice?: number;
  salePrice?: number;
};

export function validateUpdateProductInput(
  input: UpdateProductInput
): { name?: string; categoryName?: string; costPrice?: number; salePrice?: number } {
  const errors: string[] = [];
  const result: { name?: string; categoryName?: string; costPrice?: number; salePrice?: number } = {};

  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";

    if (name.length === 0) {
      errors.push("Product name is required.");
    } else {
      result.name = name;
    }
  }

  if (input.costPrice !== undefined) {
    if (!isValidNonNegativeNumber(input.costPrice)) {
      errors.push("Cost price must be a non-negative number.");
    } else {
      result.costPrice = input.costPrice;
    }
  }

  if (input.salePrice !== undefined) {
    if (!isValidNonNegativeNumber(input.salePrice)) {
      errors.push("Sale price must be a non-negative number.");
    } else {
      result.salePrice = input.salePrice;
    }
  }

  if (input.categoryName !== undefined) {
    result.categoryName = (PRODUCT_CATEGORIES as readonly string[]).includes(input.categoryName)
      ? input.categoryName
      : "Otros";
  }

  if (errors.length > 0) {
    throw new ProductValidationError(errors);
  }

  return result;
}
