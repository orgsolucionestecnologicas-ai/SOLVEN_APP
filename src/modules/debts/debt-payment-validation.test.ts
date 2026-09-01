import { describe, expect, it } from "vitest";

import {
  DebtPaymentValidationError,
  validateRegisterDebtPaymentInput
} from "./debt-payment-validation";

describe("validateRegisterDebtPaymentInput", () => {
  it("accepts valid debt payment input and defaults method to Efectivo", () => {
    expect(
      validateRegisterDebtPaymentInput({
        debtId: " debt-1 ",
        amount: 35.5
      })
    ).toEqual({
      debtId: "debt-1",
      amount: 35.5,
      method: "Efectivo"
    });
  });

  it("accepts an explicit valid payment method", () => {
    expect(
      validateRegisterDebtPaymentInput({
        debtId: "debt-1",
        amount: 35.5,
        method: "Transferencia"
      })
    ).toEqual({
      debtId: "debt-1",
      amount: 35.5,
      method: "Transferencia"
    });
  });

  it("rejects an invalid payment method", () => {
    expect(() =>
      validateRegisterDebtPaymentInput({
        debtId: "debt-1",
        amount: 35.5,
        method: "Cripto"
      })
    ).toThrow(DebtPaymentValidationError);
  });

  it("rejects an empty debt id", () => {
    expect(() =>
      validateRegisterDebtPaymentInput({
        debtId: " ",
        amount: 35.5
      })
    ).toThrow(DebtPaymentValidationError);
  });

  it("rejects zero amount", () => {
    expect(() =>
      validateRegisterDebtPaymentInput({
        debtId: "debt-1",
        amount: 0
      })
    ).toThrow(DebtPaymentValidationError);
  });

  it("rejects negative amount", () => {
    expect(() =>
      validateRegisterDebtPaymentInput({
        debtId: "debt-1",
        amount: -1
      })
    ).toThrow(DebtPaymentValidationError);
  });
});
