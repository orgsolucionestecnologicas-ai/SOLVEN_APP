import { describe, expect, it, vi } from "vitest";

import {
  SaleNoCashRegisterOpenError,
  SaleValidationError,
  validateCreateSaleInput
} from "./sale-validation";
import { createSale } from "./sale-data-access";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cashRegisterSession: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn()
  }
}));

describe("validateCreateSaleInput", () => {
  it("accepts valid sale input", () => {
    expect(
      validateCreateSaleInput({
        items: [
          {
            productId: " product-1 ",
            quantity: 2
          }
        ]
      })
    ).toEqual({
      items: [
        {
          productId: "product-1",
          quantity: 2
        }
      ],
      paymentType: "CASH"
    });
  });

  it("accepts valid credit sale input", () => {
    expect(
      validateCreateSaleInput({
        paymentType: "CREDIT",
        customerId: " customer-1 ",
        items: [
          {
            productId: "product-1",
            quantity: 2
          }
        ]
      })
    ).toEqual({
      paymentType: "CREDIT",
      customerId: "customer-1",
      items: [
        {
          productId: "product-1",
          quantity: 2
        }
      ]
    });
  });

  it("rejects a sale without items", () => {
    expect(() =>
      validateCreateSaleInput({
        items: []
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects an empty product id", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: " ",
            quantity: 2
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects zero quantity", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: "product-1",
            quantity: 0
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects negative quantity", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: "product-1",
            quantity: -1
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects non-integer quantity", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [
          {
            productId: "product-1",
            quantity: 1.5
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects invalid payment type", () => {
    expect(() =>
      validateCreateSaleInput({
        paymentType: "CARD" as "CASH",
        items: [
          {
            productId: "product-1",
            quantity: 1
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });

  it("requires customer id for credit sales", () => {
    expect(() =>
      validateCreateSaleInput({
        paymentType: "CREDIT",
        items: [
          {
            productId: "product-1",
            quantity: 1
          }
        ]
      })
    ).toThrow(SaleValidationError);
  });
});

describe("createSale", () => {
  it("throws SaleNoCashRegisterOpenError for CASH sales when no session is open", async () => {
    await expect(
      createSale({
        paymentType: "CASH",
        items: [{ productId: "product-1", quantity: 1 }]
      }, "test-tenant-id")
    ).rejects.toThrow(SaleNoCashRegisterOpenError);
  });
});
