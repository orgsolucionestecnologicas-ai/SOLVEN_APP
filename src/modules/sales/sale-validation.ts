export type CreateSaleItemInput = {
  productId?: string;
  serviceId?: string;
  quantity: number;
};

export type SalePaymentType = "CASH" | "CREDIT" | "MIXED";

export type CreateSaleInput = {
  items: CreateSaleItemInput[];
  paymentType?: SalePaymentType;
  customerId?: string;
  cashAmount?: number;
  sellerCode?: string;
  sellerId?: string;
  receiptType?: "TICKET" | "INVOICE";
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
  sellerCode: string;
  sellerId: string;
  receiptType: "TICKET" | "INVOICE";
};

export type ValidatedCreditSaleInput = {
  items: ValidatedSaleItemInput[];
  paymentType: "CREDIT";
  customerId: string;
  sellerCode: string;
  sellerId: string;
  receiptType: "TICKET" | "INVOICE";
};

export type ValidatedMixedSaleInput = {
  items: ValidatedSaleItemInput[];
  paymentType: "MIXED";
  customerId: string;
  cashAmount: number;
  sellerCode: string;
  sellerId: string;
  receiptType: "TICKET" | "INVOICE";
};

export type ValidatedSaleInput =
  | ValidatedCashSaleInput
  | ValidatedCreditSaleInput
  | ValidatedMixedSaleInput;

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

  if (paymentType !== "CASH" && paymentType !== "CREDIT" && paymentType !== "MIXED") {
    validationErrors.push("Sale payment type must be CASH, CREDIT or MIXED.");
  }

  if ((paymentType === "CREDIT" || paymentType === "MIXED") && customerId.length === 0) {
    validationErrors.push("Customer id is required for credit and mixed sales.");
  }

  const cashAmount =
    paymentType === "MIXED"
      ? typeof saleInput.cashAmount === "number" && saleInput.cashAmount >= 0
        ? saleInput.cashAmount
        : -1
      : 0;

  if (paymentType === "MIXED" && cashAmount < 0) {
    validationErrors.push("cashAmount must be a non-negative number for mixed sales.");
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

  const sellerCode = typeof saleInput.sellerCode === "string" ? saleInput.sellerCode.trim() : "";
  const sellerId = typeof saleInput.sellerId === "string" ? saleInput.sellerId.trim() : "";
  const receiptType = saleInput.receiptType === "INVOICE" ? "INVOICE" as const : "TICKET" as const;

  if (paymentType === "CREDIT") {
    return {
      items: validatedItems,
      paymentType,
      customerId,
      sellerCode,
      sellerId,
      receiptType
    };
  }

  if (paymentType === "MIXED") {
    return {
      items: validatedItems,
      paymentType: "MIXED",
      customerId,
      cashAmount,
      sellerCode,
      sellerId,
      receiptType
    };
  }

  return {
    items: validatedItems,
    paymentType: "CASH",
    sellerCode,
    sellerId,
    receiptType
  };
}
