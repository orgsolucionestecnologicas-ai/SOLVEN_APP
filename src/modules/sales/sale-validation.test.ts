import { describe, expect, it, vi } from "vitest";

import {
  SaleNoCashRegisterOpenError,
  SaleValidationError,
  validateCreateSaleInput,
  validateGlobalDiscount
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
      paymentType: "CASH",
      sellerCode: "",
      sellerId: "",
      receiptType: "TICKET"
    });
  });

  it("rejects a CREDIT sale without a customer", () => {
    expect(() =>
      validateCreateSaleInput({
        paymentType: "CREDIT",
        items: [{ productId: "product-1", quantity: 2 }]
      })
    ).toThrow(SaleValidationError);
  });

  it("rejects a MIXED sale without a customer", () => {
    expect(() =>
      validateCreateSaleInput({
        paymentType: "MIXED",
        items: [{ productId: "product-1", quantity: 2 }],
        paymentDetails: [{ method: "Efectivo", amount: 10 }]
      })
    ).toThrow(SaleValidationError);
  });

  it("accepts a CREDIT sale with a customer", () => {
    expect(
      validateCreateSaleInput({
        paymentType: "CREDIT",
        customerId: " customer-1 ",
        items: [{ productId: "product-1", quantity: 2 }]
      })
    ).toEqual({
      items: [{ productId: "product-1", quantity: 2 }],
      paymentType: "CREDIT",
      customerId: "customer-1",
      sellerCode: "",
      sellerId: "",
      receiptType: "TICKET"
    });
  });

  it("accepts a MIXED sale with a customer and preserves payment details", () => {
    expect(
      validateCreateSaleInput({
        paymentType: "MIXED",
        customerId: "customer-1",
        items: [{ productId: "product-1", quantity: 2 }],
        paymentDetails: [{ method: "Efectivo", amount: 10 }]
      })
    ).toEqual({
      items: [{ productId: "product-1", quantity: 2 }],
      paymentType: "MIXED",
      customerId: "customer-1",
      sellerCode: "",
      sellerId: "",
      receiptType: "TICKET",
      paymentDetails: [{ method: "Efectivo", amount: 10 }]
    });
  });

  it("accepts sale input with sellerCode, sellerId and receiptType", () => {
    expect(
      validateCreateSaleInput({
        items: [
          {
            productId: "product-1",
            quantity: 1
          }
        ],
        sellerCode: " VE1234 ",
        sellerId: " seller-1 ",
        receiptType: "INVOICE"
      })
    ).toEqual({
      items: [
        {
          productId: "product-1",
          quantity: 1
        }
      ],
      paymentType: "CASH",
      sellerCode: "VE1234",
      sellerId: "seller-1",
      receiptType: "INVOICE"
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

  it("rejects an unknown paymentType at runtime", () => {
    expect(() =>
      validateCreateSaleInput({
        paymentType: "CARD" as "CASH",
        items: [{ productId: "product-1", quantity: 1 }]
      })
    ).toThrow(SaleValidationError);
  });

  it("accepts a valid percent item discount", () => {
    expect(
      validateCreateSaleInput({
        items: [{ productId: "product-1", quantity: 2, discount: 10, discountType: "percent" }]
      })
    ).toEqual({
      items: [{ productId: "product-1", quantity: 2, discount: 10, discountType: "percent" }],
      paymentType: "CASH",
      sellerCode: "",
      sellerId: "",
      receiptType: "TICKET"
    });
  });

  it("defaults an item discount without discountType to percent", () => {
    expect(
      validateCreateSaleInput({
        items: [{ productId: "product-1", quantity: 1, discount: 5 }]
      })
    ).toEqual({
      items: [{ productId: "product-1", quantity: 1, discount: 5, discountType: "percent" }],
      paymentType: "CASH",
      sellerCode: "",
      sellerId: "",
      receiptType: "TICKET"
    });
  });

  it("clamps a percent item discount above 100 down to 100", () => {
    const result = validateCreateSaleInput({
      items: [{ productId: "product-1", quantity: 1, discount: 150, discountType: "percent" }]
    });
    expect(result.items[0]).toMatchObject({ discount: 100, discountType: "percent" });
  });

  it("rejects a negative item discount", () => {
    expect(() =>
      validateCreateSaleInput({
        items: [{ productId: "product-1", quantity: 1, discount: -5 }]
      })
    ).toThrow(SaleValidationError);
  });
});

describe("validateGlobalDiscount", () => {
  it("returns null when no discount value is provided", () => {
    expect(validateGlobalDiscount(undefined, undefined)).toBeNull();
    expect(validateGlobalDiscount("percent", undefined)).toBeNull();
    expect(validateGlobalDiscount("percent", null)).toBeNull();
  });

  it("returns null when the discount value is zero", () => {
    expect(validateGlobalDiscount("fixed", 0)).toBeNull();
  });

  it("defaults to percent type when no type is given", () => {
    expect(validateGlobalDiscount(undefined, 10)).toEqual({ type: "percent", value: 10 });
  });

  it("accepts a fixed discount", () => {
    expect(validateGlobalDiscount("fixed", 25)).toEqual({ type: "fixed", value: 25 });
  });

  it("clamps a percent discount above 100 down to 100", () => {
    expect(validateGlobalDiscount("percent", 150)).toEqual({ type: "percent", value: 100 });
  });

  it("throws for a negative discount value", () => {
    expect(() => validateGlobalDiscount("fixed", -10)).toThrow(SaleValidationError);
  });

  it("throws for a non-numeric discount value", () => {
    expect(() => validateGlobalDiscount("fixed", "10")).toThrow(SaleValidationError);
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
