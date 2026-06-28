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

export const IVA_RATES = [0, 0.105, 0.21, 0.27] as const;
export type IvaRate = (typeof IVA_RATES)[number];

export type CreateProductInput = {
  name: string;
  categoryName?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock?: number;
  ivaRate?: number;
};

export type ValidatedProductInput = {
  name: string;
  categoryName: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  ivaRate: number;
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

  const minStock =
    Number.isInteger(productInput.minStock) && (productInput.minStock ?? 0) >= 0
      ? (productInput.minStock ?? 0)
      : 0;

  const categoryName =
    typeof productInput.categoryName === "string" &&
    (PRODUCT_CATEGORIES as readonly string[]).includes(productInput.categoryName)
      ? productInput.categoryName
      : "Otros";

  let ivaRate = 0.21;
  if (productInput.ivaRate !== undefined) {
    if (!IVA_RATES.includes(productInput.ivaRate as IvaRate)) {
      validationErrors.push("ivaRate inválido. Valores aceptados: 0, 0.105, 0.21, 0.27");
    } else {
      ivaRate = productInput.ivaRate;
    }
  }

  if (validationErrors.length > 0) {
    throw new ProductValidationError(validationErrors);
  }

  return {
    name,
    categoryName,
    costPrice: productInput.costPrice,
    salePrice: productInput.salePrice,
    stock: productInput.stock,
    minStock,
    ivaRate
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
  minStock?: number;
  ivaRate?: number;
};

export function validateUpdateProductInput(
  input: UpdateProductInput
): { name?: string; categoryName?: string; costPrice?: number; salePrice?: number; minStock?: number; ivaRate?: number } {
  const errors: string[] = [];
  const result: { name?: string; categoryName?: string; costPrice?: number; salePrice?: number; minStock?: number; ivaRate?: number } = {};

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

  if (input.ivaRate !== undefined) {
    if (!IVA_RATES.includes(input.ivaRate as IvaRate)) {
      errors.push("ivaRate inválido. Valores aceptados: 0, 0.105, 0.21, 0.27");
    } else {
      result.ivaRate = input.ivaRate;
    }
  }

  if (input.minStock !== undefined) {
    if (!Number.isInteger(input.minStock) || input.minStock < 0) {
      errors.push("minStock must be a non-negative integer.");
    } else {
      result.minStock = input.minStock;
    }
  }

  if (errors.length > 0) {
    throw new ProductValidationError(errors);
  }

  return result;
}
