import type {
  CustomerSegment,
  PromotionActivation,
  PromotionApplication,
  PromotionType
} from "@prisma/client";

export type CreatePromotionInput = {
  name: string;
  code?: string;
  type: string;
  discountValue: number;
  application: string;
  categoryName?: string;
  productAId?: string;
  productBId?: string;
  productBDiscount?: number;
  minimumAmount?: number;
  minimumPurchaseDiscountType?: string;
  fixedPrice?: number;
  activationType: string;
  startsAt: string;
  endsAt: string;
  daysOfWeek?: string;
  maxUsages?: number;
  maxUsagesPerCustomer?: number;
  customerSegment?: string;
  isActive?: boolean;
};

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export type ValidatedCreatePromotionInput = {
  name: string;
  code?: string;
  type: PromotionType;
  discountValue: number;
  application: PromotionApplication;
  categoryName?: string;
  productAId?: string;
  productBId?: string;
  productBDiscount?: number;
  minimumAmount?: number;
  minimumPurchaseDiscountType?: string;
  fixedPrice?: number;
  activationType: PromotionActivation;
  startsAt: Date;
  endsAt: Date;
  daysOfWeek?: string;
  maxUsages?: number;
  maxUsagesPerCustomer?: number;
  customerSegment?: CustomerSegment;
  isActive: boolean;
};

export type ValidatedUpdatePromotionInput = Partial<
  Omit<ValidatedCreatePromotionInput, "type" | "application">
>;

const VALID_TYPES: PromotionType[] = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "TWO_FOR_ONE",
  "THREE_FOR_TWO",
  "MINIMUM_PURCHASE",
  "SPECIAL_PRICE",
  "BUNDLED_PRODUCTS"
];

const VALID_APPLICATIONS: PromotionApplication[] = [
  "ALL_PRODUCTS",
  "CATEGORY",
  "SPECIFIC_PRODUCT",
  "BUNDLED"
];

const VALID_ACTIVATIONS: PromotionActivation[] = [
  "AUTOMATIC",
  "MANUAL_CODE",
  "BOTH"
];

const VALID_SEGMENTS: CustomerSegment[] = ["NINGUNO", "NUEVO", "RECURRENTE", "VIP"];

export class PromotionValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "PromotionValidationError";
  }
}

export function validateCreatePromotion(
  input: CreatePromotionInput
): ValidatedCreatePromotionInput {
  const errors: string[] = [];

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length === 0) {
    errors.push("El nombre de la promoción es requerido.");
  }

  if (!VALID_TYPES.includes(input.type as PromotionType)) {
    errors.push("Tipo de promoción inválido.");
  }

  if (typeof input.discountValue !== "number" || input.discountValue < 0) {
    errors.push("El valor de descuento debe ser un número no negativo.");
  }

  if (!VALID_APPLICATIONS.includes(input.application as PromotionApplication)) {
    errors.push("Aplicación de promoción inválida.");
  }

  if (!VALID_ACTIVATIONS.includes(input.activationType as PromotionActivation)) {
    errors.push("Tipo de activación inválido.");
  }

  if (!input.startsAt || isNaN(Date.parse(input.startsAt))) {
    errors.push("La fecha de inicio es requerida y debe ser válida.");
  }

  if (!input.endsAt || isNaN(Date.parse(input.endsAt))) {
    errors.push("La fecha de fin es requerida y debe ser válida.");
  }

  if (
    input.startsAt &&
    input.endsAt &&
    !isNaN(Date.parse(input.startsAt)) &&
    !isNaN(Date.parse(input.endsAt)) &&
    new Date(input.endsAt) <= new Date(input.startsAt)
  ) {
    errors.push("La fecha de fin debe ser posterior a la fecha de inicio.");
  }

  const type = input.type as PromotionType;

  if (input.application === "CATEGORY" && !input.categoryName?.trim()) {
    errors.push(
      "El nombre de categoría es requerido para promociones de categoría."
    );
  }

  if (type === "SPECIAL_PRICE") {
    if (
      input.fixedPrice === undefined ||
      typeof input.fixedPrice !== "number" ||
      input.fixedPrice < 0
    ) {
      errors.push(
        "El precio especial es requerido y debe ser un número no negativo."
      );
    }
  }

  if (type === "MINIMUM_PURCHASE") {
    if (
      input.minimumAmount === undefined ||
      typeof input.minimumAmount !== "number" ||
      input.minimumAmount <= 0
    ) {
      errors.push(
        "El monto mínimo es requerido y debe ser mayor a cero para este tipo de promoción."
      );
    }
    if (
      input.minimumPurchaseDiscountType !== undefined &&
      input.minimumPurchaseDiscountType !== "PERCENTAGE" &&
      input.minimumPurchaseDiscountType !== "FIXED_AMOUNT"
    ) {
      errors.push("El tipo de descuento debe ser PERCENTAGE o FIXED_AMOUNT.");
    }
  }

  if (type === "BUNDLED_PRODUCTS") {
    if (!input.productAId?.trim()) {
      errors.push("El producto A es requerido para promociones de paquete.");
    }
    if (!input.productBId?.trim()) {
      errors.push("El producto B es requerido para promociones de paquete.");
    }
    if (
      input.productBDiscount === undefined ||
      typeof input.productBDiscount !== "number" ||
      input.productBDiscount <= 0 ||
      input.productBDiscount > 100
    ) {
      errors.push(
        "El descuento del producto B debe ser un número entre 1 y 100."
      );
    }
  }

  if (
    input.maxUsages !== undefined &&
    (!Number.isInteger(input.maxUsages) || input.maxUsages <= 0)
  ) {
    errors.push("El límite de usos debe ser un entero positivo.");
  }

  if (
    input.maxUsagesPerCustomer !== undefined &&
    (!Number.isInteger(input.maxUsagesPerCustomer) ||
      input.maxUsagesPerCustomer <= 0)
  ) {
    errors.push("El límite de usos por cliente debe ser un entero positivo.");
  }

  if (
    input.customerSegment !== undefined &&
    !VALID_SEGMENTS.includes(input.customerSegment as CustomerSegment)
  ) {
    errors.push("El segmento de cliente es inválido.");
  }

  if (errors.length > 0) {
    throw new PromotionValidationError(errors);
  }

  const result: ValidatedCreatePromotionInput = {
    name,
    type: type,
    discountValue: input.discountValue,
    application: input.application as PromotionApplication,
    activationType: input.activationType as PromotionActivation,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    isActive: input.isActive !== false
  };

  if (input.code?.trim()) result.code = input.code.trim();
  if (input.categoryName?.trim()) result.categoryName = input.categoryName.trim();
  if (input.productAId?.trim()) result.productAId = input.productAId.trim();
  if (input.productBId?.trim()) result.productBId = input.productBId.trim();
  if (input.productBDiscount !== undefined)
    result.productBDiscount = input.productBDiscount;
  if (input.minimumAmount !== undefined) result.minimumAmount = input.minimumAmount;
  if (input.minimumPurchaseDiscountType !== undefined)
    result.minimumPurchaseDiscountType = input.minimumPurchaseDiscountType;
  if (input.fixedPrice !== undefined) result.fixedPrice = input.fixedPrice;
  if (input.daysOfWeek?.trim()) result.daysOfWeek = input.daysOfWeek.trim();
  if (input.maxUsages !== undefined) result.maxUsages = input.maxUsages;
  if (input.maxUsagesPerCustomer !== undefined)
    result.maxUsagesPerCustomer = input.maxUsagesPerCustomer;
  if (input.customerSegment !== undefined)
    result.customerSegment = input.customerSegment as CustomerSegment;

  return result;
}

export function validateUpdatePromotion(
  input: UpdatePromotionInput
): ValidatedUpdatePromotionInput {
  const errors: string[] = [];
  const result: ValidatedUpdatePromotionInput = {};

  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length === 0) {
      errors.push("El nombre de la promoción es requerido.");
    } else {
      result.name = name;
    }
  }

  if (input.code !== undefined) {
    result.code = input.code?.trim() || undefined;
  }

  if (input.discountValue !== undefined) {
    if (typeof input.discountValue !== "number" || input.discountValue < 0) {
      errors.push("El valor de descuento debe ser un número no negativo.");
    } else {
      result.discountValue = input.discountValue;
    }
  }

  if (input.activationType !== undefined) {
    if (!VALID_ACTIVATIONS.includes(input.activationType as PromotionActivation)) {
      errors.push("Tipo de activación inválido.");
    } else {
      result.activationType = input.activationType as PromotionActivation;
    }
  }

  if (input.startsAt !== undefined) {
    if (isNaN(Date.parse(input.startsAt))) {
      errors.push("La fecha de inicio debe ser válida.");
    } else {
      result.startsAt = new Date(input.startsAt);
    }
  }

  if (input.endsAt !== undefined) {
    if (isNaN(Date.parse(input.endsAt))) {
      errors.push("La fecha de fin debe ser válida.");
    } else {
      result.endsAt = new Date(input.endsAt);
    }
  }

  if (input.isActive !== undefined) {
    result.isActive = Boolean(input.isActive);
  }

  if (input.maxUsages !== undefined) {
    if (!Number.isInteger(input.maxUsages) || input.maxUsages <= 0) {
      errors.push("El límite de usos debe ser un entero positivo.");
    } else {
      result.maxUsages = input.maxUsages;
    }
  }

  if (input.maxUsagesPerCustomer !== undefined) {
    if (
      !Number.isInteger(input.maxUsagesPerCustomer) ||
      input.maxUsagesPerCustomer <= 0
    ) {
      errors.push("El límite de usos por cliente debe ser un entero positivo.");
    } else {
      result.maxUsagesPerCustomer = input.maxUsagesPerCustomer;
    }
  }

  if (input.categoryName !== undefined) {
    result.categoryName = input.categoryName?.trim() || undefined;
  }
  if (input.daysOfWeek !== undefined) {
    result.daysOfWeek = input.daysOfWeek?.trim() || undefined;
  }
  if (input.fixedPrice !== undefined) result.fixedPrice = input.fixedPrice;
  if (input.minimumAmount !== undefined)
    result.minimumAmount = input.minimumAmount;
  if (input.minimumPurchaseDiscountType !== undefined)
    result.minimumPurchaseDiscountType = input.minimumPurchaseDiscountType;
  if (input.productAId !== undefined)
    result.productAId = input.productAId?.trim() || undefined;
  if (input.productBId !== undefined)
    result.productBId = input.productBId?.trim() || undefined;
  if (input.productBDiscount !== undefined)
    result.productBDiscount = input.productBDiscount;

  if (input.customerSegment !== undefined) {
    if (!VALID_SEGMENTS.includes(input.customerSegment as CustomerSegment)) {
      errors.push("El segmento de cliente es inválido.");
    } else {
      result.customerSegment = input.customerSegment as CustomerSegment;
    }
  }

  if (errors.length > 0) {
    throw new PromotionValidationError(errors);
  }

  return result;
}
