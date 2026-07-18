import { describe, expect, it } from "vitest";

import {
  UserValidationError,
  validateCreateUserInput,
  validateUpdateUserRoleInput
} from "./user-validation";

describe("validateCreateUserInput", () => {
  it("accepts a valid input", () => {
    const result = validateCreateUserInput({
      name: " Juan Pérez ",
      email: " Juan@Ejemplo.com ",
      password: "password123",
      role: "CASHIER"
    });

    expect(result).toEqual({
      name: "Juan Pérez",
      email: "juan@ejemplo.com",
      password: "password123",
      role: "CASHIER"
    });
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(() =>
      validateCreateUserInput({
        name: "Juan",
        email: "juan@ejemplo.com",
        password: "short",
        role: "CASHIER"
      })
    ).toThrow(UserValidationError);
  });

  it("rejects an invalid role", () => {
    expect(() =>
      validateCreateUserInput({
        name: "Juan",
        email: "juan@ejemplo.com",
        password: "password123",
        role: "ADMIN"
      })
    ).toThrow(UserValidationError);
  });

  it("rejects an empty name", () => {
    expect(() =>
      validateCreateUserInput({
        name: "",
        email: "juan@ejemplo.com",
        password: "password123",
        role: "CASHIER"
      })
    ).toThrow(UserValidationError);
  });

  it("rejects an empty email", () => {
    expect(() =>
      validateCreateUserInput({
        name: "Juan",
        email: "",
        password: "password123",
        role: "CASHIER"
      })
    ).toThrow(UserValidationError);
  });
});

describe("validateUpdateUserRoleInput", () => {
  it("accepts a valid role", () => {
    expect(validateUpdateUserRoleInput({ role: "SUPERVISOR" })).toBe("SUPERVISOR");
  });

  it("rejects an invalid role", () => {
    expect(() => validateUpdateUserRoleInput({ role: "ADMIN" })).toThrow(UserValidationError);
  });
});
