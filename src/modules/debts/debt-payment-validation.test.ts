import { describe, expect, it } from "vitest";

import {
  DebtPaymentValidationError,
  validateRegisterDebtPaymentInput
} from "./debt-payment-validation";

describe("validateRegisterDebtPaymentInput", () => {
  it("accepts valid debt payment input", () => {
    expect(
      validateRegisterDebtPaymentInput({
        debtId: " debt-1 ",
        amount: 35.5
      })
    ).toEqual({
      debtId: "debt-1",
      amount: 35.5
    });
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
