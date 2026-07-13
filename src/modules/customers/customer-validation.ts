import type { CustomerSegment } from "@prisma/client";

const VALID_SEGMENTS: CustomerSegment[] = ["NINGUNO", "NUEVO", "RECURRENTE", "VIP"];

export type CreateCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
};

export type ValidatedCustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
};

export class CustomerValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "CustomerValidationError";
  }
}

export type UpdateCustomerInput = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  internalNotes?: string;
  birthDate?: string | null;
  taxId?: string;
  segment?: string;
};

export function validateCreateCustomerInput(
  customerInput: CreateCustomerInput
): ValidatedCustomerInput {
  const validationErrors: string[] = [];
  const name =
    typeof customerInput.name === "string" ? customerInput.name.trim() : "";

  if (name.length === 0) {
    validationErrors.push("Customer name is required.");
  }

  if (validationErrors.length > 0) {
    throw new CustomerValidationError(validationErrors);
  }

  const phone =
    typeof customerInput.phone === "string"
      ? customerInput.phone.trim() || null
      : undefined;
  const email =
    typeof customerInput.email === "string"
      ? customerInput.email.trim() || null
      : undefined;
  const address =
    typeof customerInput.address === "string"
      ? customerInput.address.trim() || null
      : undefined;
  const taxId =
    typeof customerInput.taxId === "string"
      ? customerInput.taxId.trim() || null
      : undefined;

  return {
    name,
    ...(phone !== undefined ? { phone } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(taxId !== undefined ? { taxId } : {})
  };
}

export function validateUpdateCustomerInput(
  input: UpdateCustomerInput
): { name?: string; phone?: string | null; email?: string | null; address?: string | null; internalNotes?: string | null; birthDate?: Date | null; taxId?: string | null; segment?: CustomerSegment } {
  const validationErrors: string[] = [];
  const result: { name?: string; phone?: string | null; email?: string | null; address?: string | null; internalNotes?: string | null; birthDate?: Date | null; taxId?: string | null; segment?: CustomerSegment } = {};

  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length === 0) {
      validationErrors.push("Customer name cannot be empty.");
    } else {
      result.name = name;
    }
  }

  if (input.phone !== undefined) {
    result.phone = typeof input.phone === "string" ? input.phone.trim() || null : null;
  }

  if (input.email !== undefined) {
    result.email = typeof input.email === "string" ? input.email.trim() || null : null;
  }

  if (input.address !== undefined) {
    result.address = typeof input.address === "string" ? input.address.trim() || null : null;
  }

  if (input.internalNotes !== undefined) {
    result.internalNotes = typeof input.internalNotes === "string" ? input.internalNotes.trim() || null : null;
  }

  if (input.taxId !== undefined) {
    result.taxId = typeof input.taxId === "string" ? input.taxId.trim() || null : null;
  }

  if (input.birthDate !== undefined) {
    if (input.birthDate === null || input.birthDate.trim() === "") {
      result.birthDate = null;
    } else {
      const parsed = new Date(input.birthDate);
      if (Number.isNaN(parsed.getTime())) {
        validationErrors.push("La fecha de cumpleaños es inválida.");
      } else {
        result.birthDate = parsed;
      }
    }
  }

  if (input.segment !== undefined) {
    if (!VALID_SEGMENTS.includes(input.segment as CustomerSegment)) {
      validationErrors.push("El segmento del cliente es inválido.");
    } else {
      result.segment = input.segment as CustomerSegment;
    }
  }

  if (validationErrors.length > 0) {
    throw new CustomerValidationError(validationErrors);
  }

  return result;
}
