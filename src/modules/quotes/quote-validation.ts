export type CreateQuoteItemInput = {
  productId?: string;
  serviceId?: string;
  quantity: number;
};

export type CreateQuoteInput = {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: CreateQuoteItemInput[];
  notes?: string;
  paymentTerms?: string;
  discountAmount?: number;
};

export class QuoteValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "QuoteValidationError";
  }
}

export class QuoteNotFoundError extends Error {
  constructor() {
    super("Cotización no encontrada.");
    this.name = "QuoteNotFoundError";
  }
}

export class QuoteAlreadyConfirmedError extends Error {
  constructor() {
    super("La cotización ya fue confirmada.");
    this.name = "QuoteAlreadyConfirmedError";
  }
}

export class QuoteExpiredError extends Error {
  constructor() {
    super("La cotización ha expirado.");
    this.name = "QuoteExpiredError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateQuoteInput(input: CreateQuoteInput): void {
  const errors: string[] = [];

  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.push("La cotización debe incluir al menos un item.");
  }

  const customerId = typeof input.customerId === "string" ? input.customerId.trim() : "";
  const customerName = typeof input.customerName === "string" ? input.customerName.trim() : "";

  if (!customerId && !customerName) {
    errors.push("El nombre del cliente es obligatorio si no se selecciona un cliente existente.");
  }

  const customerEmail = typeof input.customerEmail === "string" ? input.customerEmail.trim() : "";
  if (customerEmail && !EMAIL_RE.test(customerEmail)) {
    errors.push("El email del cliente no tiene un formato válido.");
  }

  const items = Array.isArray(input.items) ? input.items : [];
  for (const item of items) {
    const hasProduct = typeof item.productId === "string" && item.productId.trim().length > 0;
    const hasService = typeof item.serviceId === "string" && item.serviceId.trim().length > 0;

    if (!hasProduct && !hasService) {
      errors.push("Cada item debe tener un producto o servicio.");
    } else if (hasProduct && hasService) {
      errors.push("Cada item no puede tener producto y servicio al mismo tiempo.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push("La cantidad de cada item debe ser un entero positivo.");
    }
  }

  if (errors.length > 0) {
    throw new QuoteValidationError(errors);
  }
}
