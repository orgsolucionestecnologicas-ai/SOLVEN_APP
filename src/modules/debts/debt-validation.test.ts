import { describe, expect, it } from "vitest";

import {
  DebtValidationError,
  validateCreateDebtInput
} from "./debt-validation";

describe("validateCreateDebtInput", () => {
  it("accepts valid debt input", () => {
    expect(
      validateCreateDebtInput({
        customerId: " customer-1 ",
        totalAmount: 120.5
      })
    ).toEqual({
      customerId: "customer-1",
      totalAmount: 120.5,
      remainingAmount: 120.5
    });
  });

  it("rejects an empty customer id", () => {
    expect(() =>
      validateCreateDebtInput({
        customerId: " ",
        totalAmount: 120.5
      })
    ).toThrow(DebtValidationError);
  });

  it("rejects zero total amount", () => {
    expect(() =>
      validateCreateDebtInput({
        customerId: "customer-1",
        totalAmount: 0
      })
    ).toThrow(DebtValidationError);
  });

  it("rejects negative total amount", () => {
    expect(() =>
      validateCreateDebtInput({
        customerId: "customer-1",
        totalAmount: -1
      })
    ).toThrow(DebtValidationError);
  });
});
