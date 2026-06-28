import { describe, expect, it } from "vitest";

import {
  StockAdjustmentValidationError,
  validateAdjustProductStockInput
} from "./stock-adjustment-validation";

describe("validateAdjustProductStockInput", () => {
  it("accepts valid stock adjustment input", () => {
    expect(
      validateAdjustProductStockInput({
        productId: " product-1 ",
        newStock: 12,
        reason: " Manual count "
      })
    ).toEqual({
      productId: "product-1",
      newStock: 12,
      reason: "Manual count"
    });
  });

  it("rejects an empty product id", () => {
    expect(() =>
      validateAdjustProductStockInput({
        productId: " ",
        newStock: 12,
        reason: "Manual count"
      })
    ).toThrow(StockAdjustmentValidationError);
  });

  it("rejects an empty reason", () => {
    expect(() =>
      validateAdjustProductStockInput({
        productId: "product-1",
        newStock: 12,
        reason: " "
      })
    ).toThrow(StockAdjustmentValidationError);
  });

  it("rejects negative new stock", () => {
    expect(() =>
      validateAdjustProductStockInput({
        productId: "product-1",
        newStock: -1,
        reason: "Manual count"
      })
    ).toThrow(StockAdjustmentValidationError);
  });

  it("rejects non-integer new stock", () => {
    expect(() =>
      validateAdjustProductStockInput({
        productId: "product-1",
        newStock: 1.5,
        reason: "Manual count"
      })
    ).toThrow(StockAdjustmentValidationError);
  });
});
