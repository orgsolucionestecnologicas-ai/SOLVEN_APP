import { describe, expect, it } from "vitest";

import {
  SaleValidationError,
  validateCreateSaleInput
} from "./sale-validation";

describe("validateCreateSaleInput", () => {
  it("accepts valid sale input", () => {
    expect(
      validateCreateSaleInput({
        items: [
          {
            productId: " product-1 ",
            quantity: 2
          }
        ]
      })
    ).toEqual({
      items: [
        {
          productId: "product-1",
          quantity: 2
        }
      ]
    });
  });

  it("rejects a sale without items", () => {
    expect(() =>
      validateCreateSaleInput({
        items: []
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects an empty product id", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: " ",
            quantity: 2
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects zero quantity", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: "product-1",
            quantity: 0
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects negative quantity", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: "product-1",
            quantity: -1
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects non-integer quantity", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: "product-1",
            quantity: 1.5
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });
});
