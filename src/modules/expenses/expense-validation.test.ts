import { describe, expect, it } from "vitest";

import {
  ExpenseValidationError,
  validateCreateExpenseInput
} from "./expense-validation";

describe("validateCreateExpenseInput", () => {
  it("accepts valid expense input", () => {
    expect(
      validateCreateExpenseInput({
        amount: 25.5,
        category: " Supplies ",
        description: " Printer paper "
      })
    ).toEqual({
      amount: 25.5,
      category: "Supplies",
      description: "Printer paper"
    });
  });

  it("rejects zero amount", () => {
    expect(() =>
      validateCreateExpenseInput({
        amount: 0,
        category: "Supplies",
        description: "Printer paper"
      })
    ).toThrow(ExpenseValidationError);
  });

  it("rejects negative amount", () => {
    expect(() =>
      validateCreateExpenseInput({
        amount: -1,
        category: "Supplies",
        description: "Printer paper"
      })
    ).toThrow(ExpenseValidationError);
  });

  it("rejects an empty category", () => {
    expect(() =>
      validateCreateExpenseInput({
        amount: 25.5,
        category: " ",
        description: "Printer paper"
      })
    ).toThrow(ExpenseValidationError);
  });

  it("rejects an empty description", () => {
    expect(() =>
      validateCreateExpenseInput({
        amount: 25.5,
        category: "Supplies",
        description: " "
      })
    ).toThrow(ExpenseValidationError);
  });
});
