import type { CashMovement } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateCashMovementInput,
  validateCreateCashMovementInput
} from "./cash-movement-validation";

export async function createCashMovement(
  movementInput: CreateCashMovementInput,
  tenantId: string
): Promise<CashMovement> {
  const validatedMovement = validateCreateCashMovementInput(movementInput);

  return prisma.cashMovement.create({
    data: { ...validatedMovement, tenantId }
  });
}

export type PaginationParams = { page?: number; limit?: number; from?: Date; to?: Date };

export async function listCashMovements(
  tenantId: string,
  { page = 1, limit = 20, from, to }: PaginationParams = {}
): Promise<{ data: CashMovement[]; total: number }> {
  const where = {
    tenantId,
    ...(from ? { movementDate: { gte: from, ...(to ? { lte: to } : {}) } } : {})
  };
  const [data, total] = await prisma.$transaction([
    prisma.cashMovement.findMany({ where, orderBy: { movementDate: "desc" }, take: limit, skip: (page - 1) * limit }),
    prisma.cashMovement.count({ where }),
  ]);
  return { data, total };
}
