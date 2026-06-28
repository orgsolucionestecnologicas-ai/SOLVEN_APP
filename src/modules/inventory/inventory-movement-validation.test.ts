import { describe, expect, it } from "vitest";

import {
  InventoryMovementValidationError,
  validateRecordInventoryMovementInput
} from "./inventory-movement-validation";

describe("validateRecordInventoryMovementInput", () => {
  it("accepts valid inventory movement input", () => {
    expect(
      validateRecordInventoryMovementInput({
        productId: " product-1 ",
        reason: " Initial stock ",
        previousStock: 0,
        newStock: 10,
        quantityChange: 10
      })
    ).toEqual({
      productId: "product-1",
      reason: "Initial stock",
      previousStock: 0,
      newStock: 10,
      quantityChange: 10
    });
  });

  it("rejects an empty product id", () => {
    expect(() =>
      validateRecordInventoryMovementInput({
        productId: " ",
        reason: "Initial stock",
        previousStock: 0,
        newStock: 10,
        quantityChange: 10
      })
    ).toThrow(InventoryMovementValidationError);
  });

  it("rejects an empty reason", () => {
    expect(() =>
      validateRecordInventoryMovementInput({
        productId: "product-1",
        reason: " ",
        previousStock: 0,
        newStock: 10,
        quantityChange: 10
      })
    ).toThrow(InventoryMovementValidationError);
  });

  it("rejects negative previous stock", () => {
    expect(() =>
      validateRecordInventoryMovementInput({
        productId: "product-1",
        reason: "Initial stock",
        previousStock: -1,
        newStock: 10,
        quantityChange: 10
      })
    ).toThrow(InventoryMovementValidationError);
  });

  it("rejects non-integer previous stock", () => {
    expect(() =>
      validateRecordInventoryMovementInput({
        productId: "product-1",
        reason: "Initial stock",
        previousStock: 1.5,
        newStock: 10,
        quantityChange: 10
      })
    ).toThrow(InventoryMovementValidationError);
  });

  it("rejects negative new stock", () => {
    expect(() =>
      validateRecordInventoryMovementInput({
        productId: "product-1",
        reason: "Initial stock",
        previousStock: 0,
        newStock: -1,
        quantityChange: 10
      })
    ).toThrow(InventoryMovementValidationError);
  });

  it("rejects non-integer new stock", () => {
    expect(() =>
      validateRecordInventoryMovementInput({
        productId: "product-1",
        reason: "Initial stock",
        previousStock: 0,
        newStock: 1.5,
        quantityChange: 10
      })
    ).toThrow(InventoryMovementValidationError);
  });

  it("rejects non-integer quantity change", () => {
    expect(() =>
      validateRecordInventoryMovementInput({
        productId: "product-1",
        reason: "Initial stock",
        previousStock: 0,
        newStock: 10,
        quantityChange: 1.5
      })
    ).toThrow(InventoryMovementValidationError);
  });
});
