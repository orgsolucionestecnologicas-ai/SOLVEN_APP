import { describe, expect, it } from "vitest";

import {
  ServiceValidationError,
  validateCreateServiceInput,
  validateUpdateServiceInput
} from "./service-validation";

describe("validateCreateServiceInput", () => {
  it("accepts valid input with all fields", () => {
    expect(
      validateCreateServiceInput({
        name: " Corte de cabello ",
        price: 150,
        description: " Incluye lavado ",
        ivaRate: 0.105
      })
    ).toEqual({
      name: "Corte de cabello",
      price: 150,
      description: "Incluye lavado",
      ivaRate: 0.105
    });
  });

  it("accepts valid input without description", () => {
    expect(
      validateCreateServiceInput({
        name: "Masaje",
        price: 500
      })
    ).toEqual({
      name: "Masaje",
      price: 500,
      ivaRate: 0.21
    });
  });

  it("rejects an invalid ivaRate", () => {
    expect(() =>
      validateCreateServiceInput({ name: "Servicio", price: 100, ivaRate: 0.15 })
    ).toThrow(ServiceValidationError);
  });

  it("trims name whitespace", () => {
    const result = validateCreateServiceInput({ name: "  Limpieza  ", price: 200 });
    expect(result.name).toBe("Limpieza");
  });

  it("rejects empty name", () => {
    expect(() =>
      validateCreateServiceInput({ name: " ", price: 100 })
    ).toThrow(ServiceValidationError);
  });

  it("rejects zero price", () => {
    expect(() =>
      validateCreateServiceInput({ name: "Servicio", price: 0 })
    ).toThrow(ServiceValidationError);
  });

  it("rejects negative price", () => {
    expect(() =>
      validateCreateServiceInput({ name: "Servicio", price: -50 })
    ).toThrow(ServiceValidationError);
  });

  it("rejects non-number price", () => {
    expect(() =>
      validateCreateServiceInput({ name: "Servicio", price: "cien" as unknown as number })
    ).toThrow(ServiceValidationError);
  });

  it("collects multiple validation errors", () => {
    expect(() =>
      validateCreateServiceInput({ name: "", price: -1 })
    ).toThrow(ServiceValidationError);
  });
});

describe("validateUpdateServiceInput", () => {
  it("accepts a valid ivaRate", () => {
    expect(validateUpdateServiceInput({ ivaRate: 0.27 })).toEqual({ ivaRate: 0.27 });
  });

  it("rejects an invalid ivaRate", () => {
    expect(() => validateUpdateServiceInput({ ivaRate: 0.5 })).toThrow(
      ServiceValidationError
    );
  });

  it("leaves ivaRate untouched when not provided", () => {
    expect(validateUpdateServiceInput({ price: 300 })).toEqual({ price: 300 });
  });
});
