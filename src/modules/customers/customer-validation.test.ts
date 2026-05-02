import { describe, expect, it } from "vitest";

import {
  CustomerValidationError,
  validateCreateCustomerInput
} from "./customer-validation";

describe("validateCreateCustomerInput", () => {
  it("accepts valid customer input", () => {
    expect(
      validateCreateCustomerInput({
        name: " Maria Lopez "
      })
    ).toEqual({
      name: "Maria Lopez"
    });
  });

  it("rejects an empty customer name", () => {
    expect(() =>
      validateCreateCustomerInput({
        name: " "
      })
    ).toThrow(CustomerValidationError);
  });
});
