import { describe, expect, it } from "vitest";

import {
  CashMovementValidationError,
  validateCreateCashMovementInput
} from "./cash-movement-validation";

describe("validateCreateCashMovementInput", () => {
  it("accepts valid cash movement input", () => {
    expect(
      validateCreateCashMovementInput({
        type: "IN",
        amount: 30.5,
        source: " Sale ",
        referenceId: " sale-1 "
      })
    ).toEqual({
      type: "IN",
      amount: 30.5,
      source: "Sale",
      referenceId: "sale-1",
      note: null
    });
  });

  it("accepts OUT cash movement type", () => {
    expect(
      validateCreateCashMovementInput({
        type: "OUT",
        amount: 15,
        source: "Expense",
        referenceId: "expense-1"
      })
    ).toEqual({
      type: "OUT",
      amount: 15,
      source: "Expense",
      referenceId: "expense-1",
      note: null
    });
  });

  it("rejects an invalid cash movement type", () => {
    expect(() =>
      validateCreateCashMovementInput({
        type: "INVALID" as "IN",
        amount: 30.5,
        source: "Sale",
        referenceId: "sale-1"
      })
    ).toThrow(CashMovementValidationError);
  });

  it("rejects zero amount", () => {
    expect(() =>
      validateCreateCashMovementInput({
        type: "IN",
        amount: 0,
        source: "Sale",
        referenceId: "sale-1"
      })
    ).toThrow(CashMovementValidationError);
  });

  it("rejects negative amount", () => {
    expect(() =>
      validateCreateCashMovementInput({
        type: "IN",
        amount: -1,
        source: "Sale",
        referenceId: "sale-1"
      })
    ).toThrow(CashMovementValidationError);
  });

  it("rejects an empty source", () => {
    expect(() =>
      validateCreateCashMovementInput({
        type: "IN",
        amount: 30.5,
        source: " ",
        referenceId: "sale-1"
      })
    ).toThrow(CashMovementValidationError);
  });

  it("rejects an empty reference id", () => {
    expect(() =>
      validateCreateCashMovementInput({
        type: "IN",
        amount: 30.5,
        source: "Sale",
        referenceId: " "
      })
    ).toThrow(CashMovementValidationError);
  });
});
