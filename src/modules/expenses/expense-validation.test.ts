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
      description: "Printer paper",
      receiptUrl: null,
      supplierId: null
    });
  });

  it("rejects a receipt that is not a valid image or PDF data URL", () => {
    expect(() =>
      validateCreateExpenseInput({
        amount: 25.5,
        category: "Supplies",
        description: "Printer paper",
        receiptUrl: "not-a-data-url"
      })
    ).toThrow(ExpenseValidationError);
  });

  it("accepts a valid image receipt data URL", () => {
    expect(
      validateCreateExpenseInput({
        amount: 25.5,
        category: "Supplies",
        description: "Printer paper",
        receiptUrl: "data:image/png;base64,aGVsbG8="
      })
    ).toEqual({
      amount: 25.5,
      category: "Supplies",
      description: "Printer paper",
      receiptUrl: "data:image/png;base64,aGVsbG8=",
      supplierId: null
    });
  });

  it("accepts a supplierId and trims it", () => {
    expect(
      validateCreateExpenseInput({
        amount: 25.5,
        category: "Supplies",
        description: "Printer paper",
        supplierId: " supplier_123 "
      })
    ).toEqual({
      amount: 25.5,
      category: "Supplies",
      description: "Printer paper",
      receiptUrl: null,
      supplierId: "supplier_123"
    });
  });

  it("treats an empty supplierId as null", () => {
    expect(
      validateCreateExpenseInput({
        amount: 25.5,
        category: "Supplies",
        description: "Printer paper",
        supplierId: ""
      })
    ).toEqual({
      amount: 25.5,
      category: "Supplies",
      description: "Printer paper",
      receiptUrl: null,
      supplierId: null
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
