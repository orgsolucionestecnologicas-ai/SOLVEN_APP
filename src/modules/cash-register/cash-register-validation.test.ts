import { describe, expect, it } from "vitest";

import { CashRegisterValidationError, validateCloseSession, validateOpenSession } from "./cash-register-validation";

describe("validateOpenSession", () => {
  it("returns validated input with defaults when valid", () => {
    const result = validateOpenSession({ cashierName: "Ana", openingAmount: 500 });
    expect(result.cashierName).toBe("Ana");
    expect(result.branchName).toBe("Tienda Principal");
    expect(result.openingAmount).toBe(500);
  });

  it("uses provided branchName when given", () => {
    const result = validateOpenSession({ cashierName: "Juan", branchName: "Sucursal Norte", openingAmount: 0 });
    expect(result.branchName).toBe("Sucursal Norte");
  });

  it("throws when cashierName is empty", () => {
    expect(() => validateOpenSession({ cashierName: "  ", openingAmount: 100 })).toThrow(
      CashRegisterValidationError
    );
  });

  it("throws when openingAmount is negative", () => {
    expect(() => validateOpenSession({ cashierName: "Ana", openingAmount: -1 })).toThrow(
      CashRegisterValidationError
    );
  });

  it("throws when openingAmount is not a number", () => {
    expect(() =>
      validateOpenSession({ cashierName: "Ana", openingAmount: NaN })
    ).toThrow(CashRegisterValidationError);
  });

  it("includes optional shift and notes when provided", () => {
    const result = validateOpenSession({
      cashierName: "Ana",
      openingAmount: 100,
      shift: "Mañana",
      openingNotes: "Todo bien"
    });
    expect(result.shift).toBe("Mañana");
    expect(result.openingNotes).toBe("Todo bien");
  });
});

describe("validateCloseSession", () => {
  it("returns validated input when valid", () => {
    const result = validateCloseSession({ closingAmount: 750 });
    expect(result.closingAmount).toBe(750);
  });

  it("allows zero closing amount", () => {
    const result = validateCloseSession({ closingAmount: 0 });
    expect(result.closingAmount).toBe(0);
  });

  it("throws when closingAmount is negative", () => {
    expect(() => validateCloseSession({ closingAmount: -5 })).toThrow(CashRegisterValidationError);
  });

  it("throws when closingAmount is NaN", () => {
    expect(() => validateCloseSession({ closingAmount: NaN })).toThrow(CashRegisterValidationError);
  });

  it("includes optional notes when provided", () => {
    const result = validateCloseSession({ closingAmount: 300, closingNotes: "Diferencia de caja" });
    expect(result.closingNotes).toBe("Diferencia de caja");
  });
});
