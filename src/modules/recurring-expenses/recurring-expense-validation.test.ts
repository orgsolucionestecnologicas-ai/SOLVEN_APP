import { describe, expect, it } from "vitest";

import {
  RecurringExpenseValidationError,
  validateCreateRecurringExpenseInput
} from "./recurring-expense-validation";

describe("validateCreateRecurringExpenseInput", () => {
  it("accepts valid input and defaults the payment method to Efectivo", () => {
    expect(
      validateCreateRecurringExpenseInput({
        category: " Alquiler ",
        amount: 50000,
        description: " Alquiler del local ",
        dayOfMonth: 5
      })
    ).toEqual({
      category: "Alquiler",
      amount: 50000,
      description: "Alquiler del local",
      dayOfMonth: 5,
      method: "Efectivo"
    });
  });

  it("accepts an explicit valid payment method", () => {
    expect(
      validateCreateRecurringExpenseInput({
        category: "Alquiler",
        amount: 50000,
        dayOfMonth: 5,
        method: "Transferencia"
      })
    ).toEqual({
      category: "Alquiler",
      amount: 50000,
      description: null,
      dayOfMonth: 5,
      method: "Transferencia"
    });
  });

  it("rejects an invalid payment method", () => {
    expect(() =>
      validateCreateRecurringExpenseInput({
        category: "Alquiler",
        amount: 50000,
        dayOfMonth: 5,
        method: "Cripto"
      })
    ).toThrow(RecurringExpenseValidationError);
  });

  it("rejects a zero or negative amount", () => {
    expect(() =>
      validateCreateRecurringExpenseInput({ category: "Alquiler", amount: 0, dayOfMonth: 5 })
    ).toThrow(RecurringExpenseValidationError);
    expect(() =>
      validateCreateRecurringExpenseInput({ category: "Alquiler", amount: -1, dayOfMonth: 5 })
    ).toThrow(RecurringExpenseValidationError);
  });

  it("rejects an empty category", () => {
    expect(() =>
      validateCreateRecurringExpenseInput({ category: " ", amount: 50000, dayOfMonth: 5 })
    ).toThrow(RecurringExpenseValidationError);
  });

  it("rejects a day of month outside 1-31", () => {
    expect(() =>
      validateCreateRecurringExpenseInput({ category: "Alquiler", amount: 50000, dayOfMonth: 0 })
    ).toThrow(RecurringExpenseValidationError);
    expect(() =>
      validateCreateRecurringExpenseInput({ category: "Alquiler", amount: 50000, dayOfMonth: 32 })
    ).toThrow(RecurringExpenseValidationError);
  });

  it("treats an empty description as null", () => {
    expect(
      validateCreateRecurringExpenseInput({
        category: "Alquiler",
        amount: 50000,
        description: "  ",
        dayOfMonth: 5
      })
    ).toEqual({
      category: "Alquiler",
      amount: 50000,
      description: null,
      dayOfMonth: 5,
      method: "Efectivo"
    });
  });
});
