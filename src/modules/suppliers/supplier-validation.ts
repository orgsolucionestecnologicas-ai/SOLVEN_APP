export class SupplierValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "SupplierValidationError";
  }
}

export type CreateSupplierInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
};

export function validateCreateSupplierInput(input: unknown): CreateSupplierInput {
  const raw = (input ?? {}) as Record<string, unknown>;
  const reasons: string[] = [];

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length === 0) {
    reasons.push("El nombre del proveedor es requerido.");
  }

  const phone =
    typeof raw.phone === "string" && raw.phone.trim().length > 0 ? raw.phone.trim() : null;
  const email =
    typeof raw.email === "string" && raw.email.trim().length > 0 ? raw.email.trim() : null;

  if (reasons.length > 0) {
    throw new SupplierValidationError(reasons);
  }

  return { name, phone, email };
}
