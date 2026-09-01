import { describe, expect, it } from "vitest";

import {
  getSalePriceBelowCostWarning,
  ProductValidationError,
  validateCreateProductInput
} from "./product-validation";

describe("getSalePriceBelowCostWarning", () => {
  it("returns a warning when salePrice is below costPrice", () => {
    expect(getSalePriceBelowCostWarning(10, 8)).toBe(
      "El precio de venta es menor al costo del producto."
    );
  });

  it("returns null when salePrice is equal to or above costPrice", () => {
    expect(getSalePriceBelowCostWarning(10, 10)).toBeNull();
    expect(getSalePriceBelowCostWarning(10, 15)).toBeNull();
  });
});

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
      minStock: 0,
      ivaRate: 0.21,
      unit: "Unidad (ud)"
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

  it("rejects an invalid ivaRate", () => {
    expect(() =>
      validateCreateProductInput({
        name: "Rice",
        costPrice: 10,
        salePrice: 15,
        stock: 5,
        ivaRate: 15
      })
    ).toThrow(ProductValidationError);
  });

  it("accepts a valid ivaRate of 0.105", () => {
    expect(
      validateCreateProductInput({
        name: "Rice",
        costPrice: 10,
        salePrice: 15,
        stock: 5,
        ivaRate: 0.105
      })
    ).toMatchObject({ ivaRate: 0.105 });
  });
});
