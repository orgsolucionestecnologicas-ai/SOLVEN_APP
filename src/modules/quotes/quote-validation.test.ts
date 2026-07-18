import { describe, expect, it } from "vitest";

import { QuoteValidationError, validateCreateQuoteInput } from "./quote-validation";

describe("validateCreateQuoteInput", () => {
  it("accepts a valid input with a product item", () => {
    expect(() =>
      validateCreateQuoteInput({
        customerId: "customer-1",
        items: [{ productId: "product-1", quantity: 2 }]
      })
    ).not.toThrow();
  });

  it("accepts a valid input with a service item", () => {
    expect(() =>
      validateCreateQuoteInput({
        customerName: "Juan Pérez",
        items: [{ serviceId: "service-1", quantity: 1 }]
      })
    ).not.toThrow();
  });

  it("rejects an empty items array", () => {
    expect(() =>
      validateCreateQuoteInput({ customerId: "customer-1", items: [] })
    ).toThrow(QuoteValidationError);
  });

  it("rejects when neither customerId nor customerName is provided", () => {
    expect(() =>
      validateCreateQuoteInput({ items: [{ productId: "product-1", quantity: 1 }] })
    ).toThrow(QuoteValidationError);
  });

  it("rejects an invalid customerEmail format", () => {
    expect(() =>
      validateCreateQuoteInput({
        customerName: "Juan Pérez",
        customerEmail: "not-an-email",
        items: [{ productId: "product-1", quantity: 1 }]
      })
    ).toThrow(QuoteValidationError);
  });

  it("rejects an item with both productId and serviceId", () => {
    expect(() =>
      validateCreateQuoteInput({
        customerId: "customer-1",
        items: [{ productId: "product-1", serviceId: "service-1", quantity: 1 }]
      })
    ).toThrow(QuoteValidationError);
  });

  it("rejects an item without productId or serviceId", () => {
    expect(() =>
      validateCreateQuoteInput({
        customerId: "customer-1",
        items: [{ quantity: 1 }]
      })
    ).toThrow(QuoteValidationError);
  });

  it("rejects a non-integer quantity", () => {
    expect(() =>
      validateCreateQuoteInput({
        customerId: "customer-1",
        items: [{ productId: "product-1", quantity: 1.5 }]
      })
    ).toThrow(QuoteValidationError);
  });

  it("rejects a quantity of zero or less", () => {
    expect(() =>
      validateCreateQuoteInput({
        customerId: "customer-1",
        items: [{ productId: "product-1", quantity: 0 }]
      })
    ).toThrow(QuoteValidationError);
  });
});
