export type CreateSaleItemInput = {
  productId?: string;
  serviceId?: string;
  quantity: number;
};

export type SalePaymentType = "CASH" | "CREDIT";

export type CreateSaleInput = {
  items: CreateSaleItemInput[];
  paymentType?: SalePaymentType;
  customerId?: string;
};

export type ValidatedProductSaleItemInput = {
  productId: string;
  quantity: number;
};

export type ValidatedServiceSaleItemInput = {
  serviceId: string;
  quantity: number;
};

export type ValidatedSaleItemInput =
  | ValidatedProductSaleItemInput
  | ValidatedServiceSaleItemInput;

export type ValidatedCashSaleInput = {
  items: ValidatedSaleItemInput[];
  paymentType: "CASH";
};

export type ValidatedCreditSaleInput = {
  items: ValidatedSaleItemInput[];
  paymentType: "CREDIT";
  customerId: string;
};

export type ValidatedSaleInput =
  | ValidatedCashSaleInput
  | ValidatedCreditSaleInput;

export class SaleNoCashRegisterOpenError extends Error {
  constructor() {
    super("No hay una sesión de caja abierta. Abrí la caja antes de registrar una venta en efectivo.");
    this.name = "SaleNoCashRegisterOpenError";
  }
}

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
  const paymentType = saleInput.paymentType ?? "CASH";
  const customerId =
    typeof saleInput.customerId === "string" ? saleInput.customerId.trim() : "";

  if (!Array.isArray(saleInput.items) || saleInput.items.length === 0) {
    validationErrors.push("A sale must include at least one item.");
  }

  if (paymentType !== "CASH" && paymentType !== "CREDIT") {
    validationErrors.push("Sale payment type must be CASH or CREDIT.");
  }

  if (paymentType === "CREDIT" && customerId.length === 0) {
    validationErrors.push("Customer id is required for credit sales.");
  }

  const items = Array.isArray(saleInput.items) ? saleInput.items : [];
  const validatedItems = items.map((item): ValidatedSaleItemInput => {
    const hasProduct = typeof item.productId === "string";
    const hasService = typeof item.serviceId === "string";
    const productId = hasProduct ? (item.productId as string).trim() : "";
    const serviceId = hasService ? (item.serviceId as string).trim() : "";

    if (!hasProduct && !hasService) {
      validationErrors.push("Sale item must have a product or service id.");
    } else if (hasProduct && hasService) {
      validationErrors.push(
        "Sale item cannot have both product id and service id."
      );
    } else if (hasProduct && productId.length === 0) {
      validationErrors.push("Sale item product id is required.");
    } else if (hasService && serviceId.length === 0) {
      validationErrors.push("Sale item service id is required.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      validationErrors.push("Sale item quantity must be a positive integer.");
    }

    if (hasService && !hasProduct) {
      return { serviceId, quantity: item.quantity };
    }
    return { productId, quantity: item.quantity };
  });

  if (validationErrors.length > 0) {
    throw new SaleValidationError(validationErrors);
  }

  if (paymentType === "CREDIT") {
    return {
      items: validatedItems,
      paymentType,
      customerId
    };
  }

  return {
    items: validatedItems,
    paymentType: "CASH"
  };
}
