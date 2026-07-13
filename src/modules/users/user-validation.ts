export const USER_ROLES = ["OWNER", "CASHIER", "INVENTORY", "READONLY", "SUPERVISOR"] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type ValidatedCreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRoleValue;
};

export type UpdateUserRoleInput = {
  role: string;
};

export class UserValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "UserValidationError";
  }
}

export function validateCreateUserInput(
  userInput: CreateUserInput
): ValidatedCreateUserInput {
  const validationErrors: string[] = [];

  const name = typeof userInput.name === "string" ? userInput.name.trim() : "";
  if (name.length === 0) {
    validationErrors.push("El nombre es requerido.");
  }

  const email =
    typeof userInput.email === "string" ? userInput.email.trim().toLowerCase() : "";
  if (email.length === 0) {
    validationErrors.push("El email es requerido.");
  }

  const password = typeof userInput.password === "string" ? userInput.password : "";
  if (password.length < 8) {
    validationErrors.push("La contraseña debe tener al menos 8 caracteres.");
  }

  const role = typeof userInput.role === "string" ? userInput.role : "";
  if (!USER_ROLES.includes(role as UserRoleValue)) {
    validationErrors.push("El rol seleccionado no es válido.");
  }

  if (validationErrors.length > 0) {
    throw new UserValidationError(validationErrors);
  }

  return { name, email, password, role: role as UserRoleValue };
}

export function validateUpdateUserRoleInput(input: UpdateUserRoleInput): UserRoleValue {
  const role = typeof input.role === "string" ? input.role : "";
  if (!USER_ROLES.includes(role as UserRoleValue)) {
    throw new UserValidationError(["El rol seleccionado no es válido."]);
  }
  return role as UserRoleValue;
}
