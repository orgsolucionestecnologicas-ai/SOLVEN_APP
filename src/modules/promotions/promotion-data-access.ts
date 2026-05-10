import type { Promotion, PromotionUsage } from "@prisma/client";

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
  input: CreatePromotionInput
): Promise<Promotion> {
  const data = validateCreatePromotion(input);

  return prisma.promotion.create({ data });
}

export async function listPromotions(): Promise<PromotionWithUsageCount[]> {
  return prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usages: true } } }
  });
}

export async function getPromotionById(
  id: string
): Promise<PromotionWithUsageCount> {
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: { _count: { select: { usages: true } } }
  });

  if (!promotion) {
    throw new PromotionNotFoundError(id);
  }

  return promotion;
}

export async function getPromotionByCode(
  code: string
): Promise<PromotionWithUsages | null> {
  return prisma.promotion.findUnique({
    where: { code },
    include: {
      usages: { select: { id: true, customerId: true } }
    }
  });
}

export async function updatePromotion(
  id: string,
  input: UpdatePromotionInput
): Promise<Promotion> {
  const data = validateUpdatePromotion(input);

  const existing = await prisma.promotion.findUnique({ where: { id } });
  if (!existing) {
    throw new PromotionNotFoundError(id);
  }

  return prisma.promotion.update({ where: { id }, data });
}

export async function deletePromotion(id: string): Promise<void> {
  const existing = await prisma.promotion.findUnique({
    where: { id },
    include: { _count: { select: { usages: true } } }
  });

  if (!existing) {
    throw new PromotionNotFoundError(id);
  }

  if (existing._count.usages > 0) {
    throw new PromotionHasUsagesError();
  }

  await prisma.promotion.delete({ where: { id } });
}

export async function getActivePromotions(): Promise<PromotionWithUsages[]> {
  const now = new Date();
  const todayDow = now.getDay();

  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      activationType: { in: ["AUTOMATIC", "BOTH"] }
    },
    include: {
      usages: { select: { id: true, customerId: true } }
    }
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
