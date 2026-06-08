import { describe, expect, it } from "vitest";

import {
  ProductValidationError,
  validateCreateProductInput
} from "./product-validation";

describe("validateCreateProductInput", () => {
  it("accepts valid product input", () => {
    expect(
      validateCreateProductInput({
        name: "  Rice  ",
        costPrice: 10,
        salePrice: 15,
        stock: 20
      })
    ).toEqual({
      name: "Rice",
      categoryName: "Otros",
      costPrice: 10,
      salePrice: 15,
      stock: 20,
      ivaRate: 0.21
    });
  });

  it("rejects an empty product name", () => {
    expect(() =>
      validateCreateProductInput({
        name: " ",
        costPrice: 10,
        salePrice: 15,
        stock: 20
      })
    ).toThrow(ProductValidationError);
  });

  it("rejects a negative cost price", () => {
    expect(() =>
      validateCreateProductInput({
        name: "Rice",
        costPrice: -1,
        salePrice: 15,
        stock: 20
      })
    ).toThrow(ProductValidationError);
  });

  it("rejects a negative sale price", () => {
    expect(() =>
      validateCreateProductInput({
        name: "Rice",
        costPrice: 10,
        salePrice: -1,
        stock: 20
      })
    ).toThrow(ProductValidationError);
  });

  it("rejects negative stock", () => {
    expect(() =>
      validateCreateProductInput({
        name: "Rice",
        costPrice: 10,
        salePrice: 15,
        stock: -1
      })
    ).toThrow(ProductValidationError);
  });

  it("rejects non-integer stock", () => {
    expect(() =>
      validateCreateProductInput({
        name: "Rice",
        costPrice: 10,
        salePrice: 15,
        stock: 1.5
      })
    ).toThrow(ProductValidationError);
  });

  it("does not require productCode in input", () => {
    const input = { name: "Rice", costPrice: 10, salePrice: 15, stock: 5 };
    expect(() => validateCreateProductInput(input)).not.toThrow();
  });
});
