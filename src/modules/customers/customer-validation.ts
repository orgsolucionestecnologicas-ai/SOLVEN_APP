export type CreateCustomerInput = {
  name: string;
};

export type ValidatedCustomerInput = {
  name: string;
};

export class CustomerValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "CustomerValidationError";
  }
}

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

  return {
    name
  };
}
