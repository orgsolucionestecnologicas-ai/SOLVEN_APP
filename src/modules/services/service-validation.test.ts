import { describe, expect, it } from "vitest";

import {
  ServiceValidationError,
  validateCreateServiceInput
} from "./service-validation";

describe("validateCreateServiceInput", () => {
  it("accepts valid input with all fields", () => {
    expect(
      validateCreateServiceInput({
        name: " Corte de cabello ",
        price: 150,
        description: " Incluye lavado "
      })
    ).toEqual({
      name: "Corte de cabello",
      price: 150,
      description: "Incluye lavado"
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
      price: 500
    });
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
