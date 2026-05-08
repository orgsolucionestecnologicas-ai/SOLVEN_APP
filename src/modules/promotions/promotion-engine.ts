import { Prisma } from "@prisma/client";
import type {
  PromotionActivation,
  PromotionApplication,
  PromotionType
} from "@prisma/client";

export type CartItem = {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
};

export type EnginePromotion = {
  id: string;
  name: string;
  type: PromotionType;
  discountValue: Prisma.Decimal;
  application: PromotionApplication;
  categoryName: string | null;
  productAId: string | null;
  productBId: string | null;
  productBDiscount: Prisma.Decimal | null;
  minimumAmount: Prisma.Decimal | null;
  fixedPrice: Prisma.Decimal | null;
  activationType: PromotionActivation;
  startsAt: Date;
  endsAt: Date;
  daysOfWeek: string | null;
  maxUsages: number | null;
  maxUsagesPerCustomer: number | null;
  usages: Array<{ customerId: string | null }>;
};

export type DiscountedItem = {
  productId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  finalPrice: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  promotionId?: string;
};

export type AppliedPromotion = {
  promotionId: string;
  name: string;
  discountAmount: Prisma.Decimal;
};

export type CartResult = {
  discountedItems: DiscountedItem[];
  totalDiscount: Prisma.Decimal;
  appliedPromotions: AppliedPromotion[];
};

type WorkingItem = {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  currentUnitPrice: Prisma.Decimal;
  lastPromotionId?: string;
  appliedTypes: Set<PromotionType>;
};

const ZERO = new Prisma.Decimal(0);

function isPromotionTimeValid(promotion: EnginePromotion): boolean {
  const now = new Date();
  if (promotion.startsAt > now || promotion.endsAt < now) return false;
  if (!promotion.daysOfWeek) return true;
  try {
    const days = JSON.parse(promotion.daysOfWeek) as number[];
    return days.includes(now.getDay());
  } catch {
    return true;
  }
}

function isUsageWithinLimits(
  promotion: EnginePromotion,
  customerId?: string
): boolean {
  if (
    promotion.maxUsages !== null &&
    promotion.usages.length >= promotion.maxUsages
  ) {
    return false;
  }

  if (customerId && promotion.maxUsagesPerCustomer !== null) {
    const customerUsages = promotion.usages.filter(
      (u) => u.customerId === customerId
    ).length;
    if (customerUsages >= promotion.maxUsagesPerCustomer) return false;
  }

  return true;
}

function clampToZero(value: Prisma.Decimal): Prisma.Decimal {
  return value.lessThan(ZERO) ? ZERO : value;
}

function applyPercentagePromotion(
  workingItems: WorkingItem[],
  promotion: EnginePromotion
): Prisma.Decimal {
  const { type, application, categoryName, id } = promotion;
  const multiplier = new Prisma.Decimal(1).minus(
    promotion.discountValue.div(100)
  );
  let totalDiscount = ZERO;

  for (const item of workingItems) {
    if (item.appliedTypes.has(type)) continue;

    const eligible =
      application === "ALL_PRODUCTS" ||
      (application === "CATEGORY" && item.categoryName === categoryName) ||
      (application === "SPECIFIC_PRODUCT" && item.productId === promotion.productAId);

    if (!eligible) continue;

    const newPrice = clampToZero(item.currentUnitPrice.mul(multiplier));
    const itemDiscount = item.currentUnitPrice.minus(newPrice).mul(item.quantity);
    totalDiscount = totalDiscount.plus(itemDiscount);
    item.currentUnitPrice = newPrice;
    item.appliedTypes.add(type);
    item.lastPromotionId = id;
  }

  return totalDiscount;
}

function applyFixedAmountPromotion(
  workingItems: WorkingItem[],
  promotion: EnginePromotion
): Prisma.Decimal {
  const { type, application, categoryName, discountValue, id } = promotion;
  let totalDiscount = ZERO;

  for (const item of workingItems) {
    if (item.appliedTypes.has(type)) continue;

    const eligible =
      application === "ALL_PRODUCTS" ||
      (application === "CATEGORY" && item.categoryName === categoryName) ||
      (application === "SPECIFIC_PRODUCT" && item.productId === promotion.productAId);

    if (!eligible) continue;

    const newPrice = clampToZero(item.currentUnitPrice.minus(discountValue));
    const itemDiscount = item.currentUnitPrice.minus(newPrice).mul(item.quantity);
    totalDiscount = totalDiscount.plus(itemDiscount);
    item.currentUnitPrice = newPrice;
    item.appliedTypes.add(type);
    item.lastPromotionId = id;
  }

  return totalDiscount;
}

function applySpecialPricePromotion(
  workingItems: WorkingItem[],
  promotion: EnginePromotion
): Prisma.Decimal {
  const { type, fixedPrice, id } = promotion;
  if (!fixedPrice) return ZERO;

  let totalDiscount = ZERO;

  for (const item of workingItems) {
    if (item.appliedTypes.has(type)) continue;
    if (item.productId !== promotion.productAId && promotion.application === "SPECIFIC_PRODUCT") {
      continue;
    }
    if (promotion.application !== "SPECIFIC_PRODUCT") continue;

    const newPrice = clampToZero(fixedPrice);
    if (newPrice.greaterThanOrEqualTo(item.currentUnitPrice)) continue;

    const itemDiscount = item.currentUnitPrice.minus(newPrice).mul(item.quantity);
    totalDiscount = totalDiscount.plus(itemDiscount);
    item.currentUnitPrice = newPrice;
    item.appliedTypes.add(type);
    item.lastPromotionId = id;
  }

  return totalDiscount;
}

function applyNForMPromotion(
  workingItems: WorkingItem[],
  promotion: EnginePromotion,
  groupSize: number,
  freePerGroup: number
): Prisma.Decimal {
  const { type, application, categoryName, id } = promotion;

  const eligibleItems = workingItems.filter((item) => {
    if (item.appliedTypes.has(type)) return false;
    return (
      application === "ALL_PRODUCTS" ||
      (application === "CATEGORY" && item.categoryName === categoryName) ||
      (application === "SPECIFIC_PRODUCT" && item.productId === promotion.productAId)
    );
  });

  if (eligibleItems.length === 0) return ZERO;

  const totalUnits = eligibleItems.reduce((s, i) => s + i.quantity, 0);
  const freeUnits =
    Math.floor(totalUnits / groupSize) * freePerGroup;

  if (freeUnits === 0) return ZERO;

  const allUnits: Array<{ productId: string; price: Prisma.Decimal }> = [];
  for (const item of eligibleItems) {
    for (let j = 0; j < item.quantity; j++) {
      allUnits.push({ productId: item.productId, price: item.currentUnitPrice });
    }
  }

  allUnits.sort((a, b) => a.price.comparedTo(b.price));

  const freeCountByProduct = new Map<string, number>();
  for (let i = 0; i < freeUnits; i++) {
    const { productId } = allUnits[i];
    freeCountByProduct.set(productId, (freeCountByProduct.get(productId) ?? 0) + 1);
  }

  let totalDiscount = ZERO;

  for (const item of eligibleItems) {
    const freeCount = freeCountByProduct.get(item.productId) ?? 0;
    if (freeCount === 0) continue;

    const discount = item.currentUnitPrice.mul(freeCount);
    const paidAmount = item.currentUnitPrice.mul(item.quantity - freeCount);
    const newEffectivePrice =
      item.quantity > 0 ? paidAmount.div(item.quantity) : ZERO;

    totalDiscount = totalDiscount.plus(discount);
    item.currentUnitPrice = clampToZero(newEffectivePrice);
    item.appliedTypes.add(type);
    item.lastPromotionId = id;
  }

  return totalDiscount;
}

function applyMinimumPurchasePromotion(
  workingItems: WorkingItem[],
  promotion: EnginePromotion
): Prisma.Decimal {
  const { type, minimumAmount, discountValue, id } = promotion;
  if (!minimumAmount) return ZERO;

  const cartSubtotal = workingItems.reduce(
    (s, i) => s.plus(i.currentUnitPrice.mul(i.quantity)),
    ZERO
  );

  if (cartSubtotal.lessThan(minimumAmount)) return ZERO;

  const alreadyApplied = workingItems.some((i) => i.appliedTypes.has(type));
  if (alreadyApplied) return ZERO;

  const isPercentage = promotion.discountValue.lessThanOrEqualTo(100);
  let totalDiscount = ZERO;

  for (const item of workingItems) {
    const discount = isPercentage
      ? item.currentUnitPrice.mul(discountValue.div(100))
      : discountValue.div(workingItems.length);

    const newPrice = clampToZero(item.currentUnitPrice.minus(discount));
    const itemDiscount = item.currentUnitPrice.minus(newPrice).mul(item.quantity);
    totalDiscount = totalDiscount.plus(itemDiscount);
    item.currentUnitPrice = newPrice;
    item.appliedTypes.add(type);
    item.lastPromotionId = id;
  }

  return totalDiscount;
}

function applyBundledPromotion(
  workingItems: WorkingItem[],
  promotion: EnginePromotion
): Prisma.Decimal {
  const { type, productAId, productBId, productBDiscount, id } = promotion;
  if (!productAId || !productBId || !productBDiscount) return ZERO;

  const hasProductA = workingItems.some((i) => i.productId === productAId);
  if (!hasProductA) return ZERO;

  let totalDiscount = ZERO;

  for (const item of workingItems) {
    if (item.productId !== productBId) continue;
    if (item.appliedTypes.has(type)) continue;

    const multiplier = new Prisma.Decimal(1).minus(productBDiscount.div(100));
    const newPrice = clampToZero(item.currentUnitPrice.mul(multiplier));
    const itemDiscount = item.currentUnitPrice.minus(newPrice).mul(item.quantity);
    totalDiscount = totalDiscount.plus(itemDiscount);
    item.currentUnitPrice = newPrice;
    item.appliedTypes.add(type);
    item.lastPromotionId = id;
  }

  return totalDiscount;
}

export function applyPromotionsToCart(
  cartItems: CartItem[],
  promotions: EnginePromotion[],
  customerId?: string
): CartResult {
  const workingItems: WorkingItem[] = cartItems.map((item) => ({
    ...item,
    unitPrice: new Prisma.Decimal(item.unitPrice),
    currentUnitPrice: new Prisma.Decimal(item.unitPrice),
    appliedTypes: new Set<PromotionType>()
  }));

  const appliedPromotions: AppliedPromotion[] = [];

  for (const promotion of promotions) {
    if (!isPromotionTimeValid(promotion)) continue;
    if (!isUsageWithinLimits(promotion, customerId)) continue;

    let promotionDiscount: Prisma.Decimal;

    switch (promotion.type) {
      case "PERCENTAGE":
        promotionDiscount = applyPercentagePromotion(workingItems, promotion);
        break;
      case "FIXED_AMOUNT":
        promotionDiscount = applyFixedAmountPromotion(workingItems, promotion);
        break;
      case "SPECIAL_PRICE":
        promotionDiscount = applySpecialPricePromotion(workingItems, promotion);
        break;
      case "TWO_FOR_ONE":
        promotionDiscount = applyNForMPromotion(workingItems, promotion, 2, 1);
        break;
      case "THREE_FOR_TWO":
        promotionDiscount = applyNForMPromotion(workingItems, promotion, 3, 1);
        break;
      case "MINIMUM_PURCHASE":
        promotionDiscount = applyMinimumPurchasePromotion(workingItems, promotion);
        break;
      case "BUNDLED_PRODUCTS":
        promotionDiscount = applyBundledPromotion(workingItems, promotion);
        break;
      default:
        promotionDiscount = ZERO;
    }

    if (promotionDiscount.greaterThan(ZERO)) {
      appliedPromotions.push({
        promotionId: promotion.id,
        name: promotion.name,
        discountAmount: promotionDiscount
      });
    }
  }

  const discountedItems: DiscountedItem[] = workingItems.map((item) => {
    const finalPrice = clampToZero(item.currentUnitPrice);
    const discountAmount = item.unitPrice
      .minus(finalPrice)
      .mul(item.quantity);

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      finalPrice,
      discountAmount: clampToZero(discountAmount),
      promotionId: item.lastPromotionId
    };
  });

  const totalDiscount = appliedPromotions.reduce(
    (s, p) => s.plus(p.discountAmount),
    ZERO
  );

  return { discountedItems, totalDiscount, appliedPromotions };
}
