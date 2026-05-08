import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  applyPromotionsToCart,
  type CartItem,
  type EnginePromotion
} from "./promotion-engine";

const PAST = new Date("2020-01-01");
const FUTURE = new Date("2099-01-01");

function makePromotion(
  overrides: Partial<EnginePromotion>
): EnginePromotion {
  return {
    id: "promo-1",
    name: "Test Promotion",
    type: "PERCENTAGE",
    discountValue: new Prisma.Decimal(10),
    application: "ALL_PRODUCTS",
    categoryName: null,
    productAId: null,
    productBId: null,
    productBDiscount: null,
    minimumAmount: null,
    fixedPrice: null,
    activationType: "AUTOMATIC",
    startsAt: PAST,
    endsAt: FUTURE,
    daysOfWeek: null,
    maxUsages: null,
    maxUsagesPerCustomer: null,
    usages: [],
    ...overrides
  };
}

function makeCartItem(overrides: Partial<CartItem>): CartItem {
  return {
    productId: "prod-1",
    productName: "Rice",
    categoryName: "Abarrotes",
    quantity: 1,
    unitPrice: 10,
    ...overrides
  };
}

describe("applyPromotionsToCart", () => {
  it("returns unmodified items when no promotions are provided", () => {
    const items = [makeCartItem({ quantity: 2, unitPrice: 10 })];
    const result = applyPromotionsToCart(items, []);

    expect(result.totalDiscount.toNumber()).toBe(0);
    expect(result.appliedPromotions).toHaveLength(0);
    expect(result.discountedItems[0].finalPrice.toNumber()).toBe(10);
    expect(result.discountedItems[0].discountAmount.toNumber()).toBe(0);
  });

  it("PERCENTAGE — applies percentage discount to all products", () => {
    const items = [
      makeCartItem({ productId: "a", quantity: 2, unitPrice: 100 }),
      makeCartItem({ productId: "b", quantity: 1, unitPrice: 50 })
    ];
    const promo = makePromotion({
      type: "PERCENTAGE",
      discountValue: new Prisma.Decimal(20),
      application: "ALL_PRODUCTS"
    });

    const result = applyPromotionsToCart(items, [promo]);

    const itemA = result.discountedItems.find((i) => i.productId === "a")!;
    const itemB = result.discountedItems.find((i) => i.productId === "b")!;

    expect(itemA.finalPrice.toNumber()).toBe(80);
    expect(itemA.discountAmount.toNumber()).toBe(40);
    expect(itemB.finalPrice.toNumber()).toBe(40);
    expect(itemB.discountAmount.toNumber()).toBe(10);
    expect(result.totalDiscount.toNumber()).toBe(50);
    expect(result.appliedPromotions).toHaveLength(1);
    expect(result.appliedPromotions[0].promotionId).toBe("promo-1");
  });

  it("PERCENTAGE — applies only to matching category", () => {
    const items = [
      makeCartItem({ productId: "a", categoryName: "Bebidas", unitPrice: 100 }),
      makeCartItem({ productId: "b", categoryName: "Abarrotes", unitPrice: 100 })
    ];
    const promo = makePromotion({
      type: "PERCENTAGE",
      discountValue: new Prisma.Decimal(10),
      application: "CATEGORY",
      categoryName: "Bebidas"
    });

    const result = applyPromotionsToCart(items, [promo]);

    const itemA = result.discountedItems.find((i) => i.productId === "a")!;
    const itemB = result.discountedItems.find((i) => i.productId === "b")!;

    expect(itemA.finalPrice.toNumber()).toBe(90);
    expect(itemB.finalPrice.toNumber()).toBe(100);
    expect(result.totalDiscount.toNumber()).toBe(10);
  });

  it("FIXED_AMOUNT — subtracts fixed amount from all product prices", () => {
    const items = [
      makeCartItem({ productId: "a", quantity: 3, unitPrice: 20 })
    ];
    const promo = makePromotion({
      type: "FIXED_AMOUNT",
      discountValue: new Prisma.Decimal(5),
      application: "ALL_PRODUCTS"
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.discountedItems[0].finalPrice.toNumber()).toBe(15);
    expect(result.discountedItems[0].discountAmount.toNumber()).toBe(15);
    expect(result.totalDiscount.toNumber()).toBe(15);
  });

  it("FIXED_AMOUNT — does not discount below zero", () => {
    const items = [makeCartItem({ unitPrice: 3 })];
    const promo = makePromotion({
      type: "FIXED_AMOUNT",
      discountValue: new Prisma.Decimal(10),
      application: "ALL_PRODUCTS"
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.discountedItems[0].finalPrice.toNumber()).toBe(0);
    expect(result.discountedItems[0].discountAmount.toNumber()).toBe(3);
  });

  it("TWO_FOR_ONE — makes cheapest unit free per pair in same category", () => {
    const items = [
      makeCartItem({
        productId: "a",
        categoryName: "Bebidas",
        quantity: 2,
        unitPrice: 10
      }),
      makeCartItem({
        productId: "b",
        categoryName: "Bebidas",
        quantity: 2,
        unitPrice: 8
      })
    ];
    const promo = makePromotion({
      type: "TWO_FOR_ONE",
      discountValue: new Prisma.Decimal(0),
      application: "CATEGORY",
      categoryName: "Bebidas"
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBeGreaterThan(0);
    const totalPaid = result.discountedItems.reduce(
      (s, i) => s + i.finalPrice.toNumber() * i.quantity,
      0
    );
    const totalOriginal = 2 * 10 + 2 * 8;
    expect(totalPaid).toBe(totalOriginal - result.totalDiscount.toNumber());
  });

  it("TWO_FOR_ONE — 4 units: 2 free (cheapest)", () => {
    const items = [
      makeCartItem({
        productId: "a",
        categoryName: "Bebidas",
        quantity: 4,
        unitPrice: 10
      })
    ];
    const promo = makePromotion({
      type: "TWO_FOR_ONE",
      discountValue: new Prisma.Decimal(0),
      application: "CATEGORY",
      categoryName: "Bebidas"
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBe(20);
    expect(result.discountedItems[0].discountAmount.toNumber()).toBe(20);
    expect(result.discountedItems[0].finalPrice.toNumber()).toBe(5);
  });

  it("THREE_FOR_TWO — 3 units: 1 free", () => {
    const items = [
      makeCartItem({
        productId: "a",
        categoryName: "Snacks",
        quantity: 3,
        unitPrice: 12
      })
    ];
    const promo = makePromotion({
      type: "THREE_FOR_TWO",
      discountValue: new Prisma.Decimal(0),
      application: "CATEGORY",
      categoryName: "Snacks"
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBe(12);
    expect(result.discountedItems[0].discountAmount.toNumber()).toBe(12);
  });

  it("THREE_FOR_TWO — below minimum quantity gives no discount", () => {
    const items = [
      makeCartItem({
        productId: "a",
        categoryName: "Snacks",
        quantity: 2,
        unitPrice: 12
      })
    ];
    const promo = makePromotion({
      type: "THREE_FOR_TWO",
      discountValue: new Prisma.Decimal(0),
      application: "CATEGORY",
      categoryName: "Snacks"
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBe(0);
  });

  it("MINIMUM_PURCHASE — applies when cart total meets threshold", () => {
    const items = [
      makeCartItem({ productId: "a", quantity: 2, unitPrice: 100 })
    ];
    const promo = makePromotion({
      type: "MINIMUM_PURCHASE",
      discountValue: new Prisma.Decimal(10),
      application: "ALL_PRODUCTS",
      minimumAmount: new Prisma.Decimal(150)
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBeGreaterThan(0);
  });

  it("MINIMUM_PURCHASE — does not apply when cart total is below threshold", () => {
    const items = [makeCartItem({ quantity: 1, unitPrice: 50 })];
    const promo = makePromotion({
      type: "MINIMUM_PURCHASE",
      discountValue: new Prisma.Decimal(10),
      application: "ALL_PRODUCTS",
      minimumAmount: new Prisma.Decimal(100)
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBe(0);
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it("SPECIAL_PRICE — sets unit price to fixed price for matching product", () => {
    const items = [
      makeCartItem({
        productId: "prod-special",
        quantity: 2,
        unitPrice: 50
      })
    ];
    const promo = makePromotion({
      type: "SPECIAL_PRICE",
      discountValue: new Prisma.Decimal(0),
      application: "SPECIFIC_PRODUCT",
      productAId: "prod-special",
      fixedPrice: new Prisma.Decimal(30)
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.discountedItems[0].finalPrice.toNumber()).toBe(30);
    expect(result.discountedItems[0].discountAmount.toNumber()).toBe(40);
    expect(result.totalDiscount.toNumber()).toBe(40);
  });

  it("BUNDLED_PRODUCTS — discounts product B when product A is in cart", () => {
    const items = [
      makeCartItem({ productId: "prod-a", quantity: 1, unitPrice: 40 }),
      makeCartItem({ productId: "prod-b", quantity: 2, unitPrice: 20 })
    ];
    const promo = makePromotion({
      type: "BUNDLED_PRODUCTS",
      discountValue: new Prisma.Decimal(0),
      application: "BUNDLED",
      productAId: "prod-a",
      productBId: "prod-b",
      productBDiscount: new Prisma.Decimal(50)
    });

    const result = applyPromotionsToCart(items, [promo]);

    const itemB = result.discountedItems.find((i) => i.productId === "prod-b")!;
    expect(itemB.finalPrice.toNumber()).toBe(10);
    expect(itemB.discountAmount.toNumber()).toBe(20);
    expect(result.totalDiscount.toNumber()).toBe(20);
  });

  it("BUNDLED_PRODUCTS — no discount when product A is absent", () => {
    const items = [
      makeCartItem({ productId: "prod-b", quantity: 2, unitPrice: 20 })
    ];
    const promo = makePromotion({
      type: "BUNDLED_PRODUCTS",
      discountValue: new Prisma.Decimal(0),
      application: "BUNDLED",
      productAId: "prod-a",
      productBId: "prod-b",
      productBDiscount: new Prisma.Decimal(50)
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBe(0);
  });

  it("does not apply expired promotion", () => {
    const items = [makeCartItem({ quantity: 1, unitPrice: 100 })];
    const promo = makePromotion({
      type: "PERCENTAGE",
      discountValue: new Prisma.Decimal(10),
      startsAt: PAST,
      endsAt: new Date("2000-01-01")
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBe(0);
  });

  it("does not apply when maxUsages is exceeded", () => {
    const items = [makeCartItem({ quantity: 1, unitPrice: 100 })];
    const promo = makePromotion({
      type: "PERCENTAGE",
      discountValue: new Prisma.Decimal(10),
      maxUsages: 2,
      usages: [{ customerId: null }, { customerId: null }]
    });

    const result = applyPromotionsToCart(items, [promo]);

    expect(result.totalDiscount.toNumber()).toBe(0);
  });

  it("does not apply when maxUsagesPerCustomer is exceeded for customer", () => {
    const items = [makeCartItem({ quantity: 1, unitPrice: 100 })];
    const promo = makePromotion({
      type: "PERCENTAGE",
      discountValue: new Prisma.Decimal(10),
      maxUsagesPerCustomer: 1,
      usages: [{ customerId: "cust-1" }]
    });

    const result = applyPromotionsToCart(items, [promo], "cust-1");

    expect(result.totalDiscount.toNumber()).toBe(0);
  });

  it("does not stack the same promotion type twice on the same item", () => {
    const items = [makeCartItem({ quantity: 1, unitPrice: 100 })];
    const promo1 = makePromotion({
      id: "promo-1",
      type: "PERCENTAGE",
      discountValue: new Prisma.Decimal(10),
      application: "ALL_PRODUCTS"
    });
    const promo2 = makePromotion({
      id: "promo-2",
      type: "PERCENTAGE",
      discountValue: new Prisma.Decimal(20),
      application: "ALL_PRODUCTS"
    });

    const result = applyPromotionsToCart(items, [promo1, promo2]);

    expect(result.discountedItems[0].finalPrice.toNumber()).toBe(90);
    expect(result.totalDiscount.toNumber()).toBe(10);
    expect(result.appliedPromotions).toHaveLength(1);
  });
});
