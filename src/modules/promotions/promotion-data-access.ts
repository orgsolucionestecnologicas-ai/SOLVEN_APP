import type { Prisma, Promotion, PromotionApplication, PromotionUsage } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreatePromotionInput,
  type UpdatePromotionInput,
  validateCreatePromotion,
  validateUpdatePromotion
} from "./promotion-validation";

export type PromotionWithUsageCount = Promotion & {
  _count: { usages: number };
};

export type PromotionWithUsages = Promotion & {
  usages: Pick<PromotionUsage, "id" | "customerId">[];
};

export class PromotionNotFoundError extends Error {
  constructor(id: string) {
    super(`Promoción ${id} no encontrada.`);
    this.name = "PromotionNotFoundError";
  }
}

export class PromotionHasUsagesError extends Error {
  constructor() {
    super("No se puede eliminar una promoción que ya ha sido utilizada.");
    this.name = "PromotionHasUsagesError";
  }
}

export async function createPromotion(
  input: CreatePromotionInput,
  tenantId: string
): Promise<Promotion> {
  const data = validateCreatePromotion(input);

  return prisma.promotion.create({ data: { ...data, tenantId } });
}

export async function listPromotions(
  tenantId: string
): Promise<PromotionWithUsageCount[]> {
  return prisma.promotion.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usages: true } } }
  });
}

export async function getPromotionById(
  id: string,
  tenantId: string
): Promise<PromotionWithUsageCount> {
  const promotion = await prisma.promotion.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { usages: true } } }
  });

  if (!promotion) throw new PromotionNotFoundError(id);

  return promotion;
}

export async function getPromotionByCode(
  code: string,
  tenantId: string
): Promise<PromotionWithUsages | null> {
  const now = new Date();
  const promotion = await prisma.promotion.findFirst({
    where: { code, tenantId },
    include: { usages: { select: { id: true, customerId: true } } }
  });

  if (!promotion) return null;
  if (!promotion.isActive) return null;
  if (promotion.startsAt > now || promotion.endsAt < now) return null;

  return promotion;
}

export async function updatePromotion(
  id: string,
  input: UpdatePromotionInput,
  tenantId: string
): Promise<Promotion> {
  const data = validateUpdatePromotion(input);

  const existing = await prisma.promotion.findFirst({ where: { id, tenantId } });
  if (!existing) throw new PromotionNotFoundError(id);

  return prisma.promotion.update({ where: { id }, data });
}

export async function deletePromotion(
  id: string,
  tenantId: string
): Promise<void> {
  const existing = await prisma.promotion.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { usages: true } } }
  });

  if (!existing) throw new PromotionNotFoundError(id);
  if (existing._count.usages > 0) throw new PromotionHasUsagesError();

  await prisma.promotion.delete({ where: { id } });
}

export async function getExpiringPromotions(
  tenantId: string,
  hoursAhead = 48
): Promise<Promotion[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return prisma.promotion.findMany({
    where: {
      tenantId,
      isActive: true,
      endsAt: { gte: now, lte: cutoff }
    },
    orderBy: { endsAt: "asc" }
  });
}

export type OverlapCheckInput = {
  application: PromotionApplication;
  categoryName?: string;
  productAId?: string;
  startsAt: Date;
  endsAt: Date;
};

export async function findOverlappingPromotions(
  input: OverlapCheckInput,
  tenantId: string,
  excludeId?: string
): Promise<Promotion[]> {
  const where: Prisma.PromotionWhereInput = {
    tenantId,
    isActive: true,
    application: input.application,
    startsAt: { lt: input.endsAt },
    endsAt: { gt: input.startsAt }
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  if (input.application === "CATEGORY") {
    where.categoryName = input.categoryName;
  } else if (input.application === "SPECIFIC_PRODUCT" || input.application === "BUNDLED") {
    where.productAId = input.productAId;
  }

  return prisma.promotion.findMany({ where, orderBy: { startsAt: "asc" } });
}

export async function getActivePromotions(
  tenantId: string
): Promise<PromotionWithUsages[]> {
  const now = new Date();
  const todayDow = now.getDay();

  const promotions = await prisma.promotion.findMany({
    where: {
      tenantId,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      activationType: { in: ["AUTOMATIC", "BOTH"] }
    },
    include: { usages: { select: { id: true, customerId: true } } }
  });

  return promotions.filter((p) => {
    if (!p.daysOfWeek) return true;
    try {
      const days = JSON.parse(p.daysOfWeek) as number[];
      return days.includes(todayDow);
    } catch {
      return true;
    }
  });
}
