export type CreateSaleItemInput = {
  productId: string;
  quantity: number;
};

export type CreateSaleInput = {
  items: CreateSaleItemInput[];
};

export type ValidatedSaleItemInput = {
  productId: string;
  quantity: number;
};

export type ValidatedSaleInput = {
  items: ValidatedSaleItemInput[];
};

export class SaleValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "SaleValidationError";
  }
}

export function validateCreateSaleInput(
  saleInput: CreateSaleInput
): ValidatedSaleInput {
  const validationErrors: string[] = [];

  if (!Array.isArray(saleInput.items) || saleInput.items.length === 0) {
    validationErrors.push("A sale must include at least one item.");
  }

  const items = Array.isArray(saleInput.items) ? saleInput.items : [];
  const validatedItems = items.map((item) => {
    const productId =
      typeof item.productId === "string" ? item.productId.trim() : "";

    if (productId.length === 0) {
      validationErrors.push("Sale item product id is required.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      validationErrors.push("Sale item quantity must be a positive integer.");
    }

    return {
      productId,
      quantity: item.quantity
    };
  });

  if (validationErrors.length > 0) {
    throw new SaleValidationError(validationErrors);
  }

  return {
    items: validatedItems
  };
}
