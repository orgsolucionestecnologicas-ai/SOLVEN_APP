import { IVA_RATES, type IvaRate } from "@/modules/products/product-validation";

export type CreateServiceInput = {
  name: string;
  price: number;
  description?: string;
  ivaRate?: number;
};

export type ValidatedServiceInput = {
  name: string;
  price: number;
  description?: string;
  ivaRate: number;
};

export type UpdateServiceInput = {
  name?: string;
  price?: number;
  description?: string;
  ivaRate?: number;
};

export class ServiceValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "ServiceValidationError";
  }
}

export function validateCreateServiceInput(
  input: CreateServiceInput
): ValidatedServiceInput {
  const validationErrors: string[] = [];
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : undefined;

  if (name.length === 0) {
    validationErrors.push("El nombre del servicio es requerido.");
  }

  if (!isValidPositiveNumber(input.price)) {
    validationErrors.push("El precio debe ser mayor a cero.");
  }

  let ivaRate = 0.21;
  if (input.ivaRate !== undefined) {
    if (!IVA_RATES.includes(input.ivaRate as IvaRate)) {
      validationErrors.push("ivaRate inválido. Valores aceptados: 0, 0.105, 0.21, 0.27");
    } else {
      ivaRate = input.ivaRate;
    }
  }

  if (validationErrors.length > 0) {
    throw new ServiceValidationError(validationErrors);
  }

  return {
    name,
    price: input.price,
    ivaRate,
    ...(description !== undefined && description.length > 0
      ? { description }
      : {})
  };
}

export function validateUpdateServiceInput(
  input: UpdateServiceInput
): Partial<ValidatedServiceInput> {
  const validationErrors: string[] = [];
  const result: Partial<ValidatedServiceInput> = {};

  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length === 0) {
      validationErrors.push("El nombre del servicio no puede estar vacío.");
    } else {
      result.name = name;
    }
  }

  if (input.price !== undefined) {
    if (!isValidPositiveNumber(input.price)) {
      validationErrors.push("El precio debe ser mayor a cero.");
    } else {
      result.price = input.price;
    }
  }

  if (input.description !== undefined) {
    result.description =
      typeof input.description === "string"
        ? input.description.trim()
        : undefined;
  }

  if (input.ivaRate !== undefined) {
    if (!IVA_RATES.includes(input.ivaRate as IvaRate)) {
      validationErrors.push("ivaRate inválido. Valores aceptados: 0, 0.105, 0.21, 0.27");
    } else {
      result.ivaRate = input.ivaRate;
    }
  }

  if (validationErrors.length > 0) {
    throw new ServiceValidationError(validationErrors);
  }

  return result;
}

function isValidPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
