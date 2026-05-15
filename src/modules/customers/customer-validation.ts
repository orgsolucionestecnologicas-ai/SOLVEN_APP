export type CreateCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
};

export type ValidatedCustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
};

export class CustomerValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "CustomerValidationError";
  }
}

export type UpdateCustomerInput = {
  name?: string;
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

  return {
    name,
    ...(phone !== undefined ? { phone } : {}),
    ...(email !== undefined ? { email } : {})
  };
}

export function validateUpdateCustomerInput(
  input: UpdateCustomerInput
): { name?: string } {
  const validationErrors: string[] = [];
  const result: { name?: string } = {};

  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length === 0) {
      validationErrors.push("Customer name cannot be empty.");
    } else {
      result.name = name;
    }
  }

  if (validationErrors.length > 0) {
    throw new CustomerValidationError(validationErrors);
  }

  return result;
}
