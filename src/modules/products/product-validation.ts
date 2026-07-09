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

export const PRODUCT_UNITS = [
  "Unidad (ud)",
  "Kilogramo (kg)",
  "Gramo (g)",
  "Litro (L)",
  "Mililitro (ml)",
  "Metro (m)",
  "Hora (hs)",
  "Caja",
  "Bolsa",
  "Paquete"
] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export type CreateProductInput = {
  name: string;
  categoryName?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock?: number;
  maxStock?: number;
  ivaRate?: number;
  supplierId?: string | null;
  unit?: string;
};

export type ValidatedProductInput = {
  name: string;
  categoryName: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  ivaRate: number;
  supplierId?: string | null;
  unit: string;
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

  let maxStock: number | undefined;
  if (productInput.maxStock !== undefined) {
    if (!Number.isInteger(productInput.maxStock) || productInput.maxStock < 0) {
      validationErrors.push("maxStock must be a non-negative integer.");
    } else {
      maxStock = productInput.maxStock;
    }
  }

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

  const supplierId =
    typeof productInput.supplierId === "string" && productInput.supplierId.trim().length > 0
      ? productInput.supplierId.trim()
      : undefined;

  const unit =
    typeof productInput.unit === "string" &&
    (PRODUCT_UNITS as readonly string[]).includes(productInput.unit)
      ? productInput.unit
      : "Unidad (ud)";

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
    maxStock,
    ivaRate,
    supplierId,
    unit
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
  maxStock?: number;
  ivaRate?: number;
  supplierId?: string | null;
  unit?: string;
};

export function validateUpdateProductInput(
  input: UpdateProductInput
): { name?: string; categoryName?: string; costPrice?: number; salePrice?: number; minStock?: number; maxStock?: number; ivaRate?: number; supplierId?: string | null; unit?: string } {
  const errors: string[] = [];
  const result: { name?: string; categoryName?: string; costPrice?: number; salePrice?: number; minStock?: number; maxStock?: number; ivaRate?: number; supplierId?: string | null; unit?: string } = {};

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

  if (input.maxStock !== undefined) {
    if (!Number.isInteger(input.maxStock) || input.maxStock < 0) {
      errors.push("maxStock must be a non-negative integer.");
    } else {
      result.maxStock = input.maxStock;
    }
  }

  if (input.supplierId !== undefined) {
    result.supplierId =
      typeof input.supplierId === "string" && input.supplierId.trim().length > 0
        ? input.supplierId.trim()
        : null;
  }

  if (input.unit !== undefined) {
    result.unit = (PRODUCT_UNITS as readonly string[]).includes(input.unit)
      ? input.unit
      : "Unidad (ud)";
  }

  if (errors.length > 0) {
    throw new ProductValidationError(errors);
  }

  return result;
}
