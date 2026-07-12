import type { Debt } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateDebtInput,
  validateCreateDebtInput
} from "./debt-validation";

export type DebtWithCustomer = Debt & { customer: { name: string } };

export async function createDebt(
  debtInput: CreateDebtInput,
  tenantId: string
): Promise<Debt> {
  const validatedDebt = validateCreateDebtInput(debtInput);

  return prisma.debt.create({
    data: {
      tenantId,
      customerId: validatedDebt.customerId,
      totalAmount: validatedDebt.totalAmount,
      remainingAmount: validatedDebt.remainingAmount,
      dueDate: validatedDebt.dueDate
    }
  });
}

export type PaginationParams = { page?: number; limit?: number; from?: Date; to?: Date };

export async function listDebts(
  tenantId: string,
  { page = 1, limit = 20, from, to }: PaginationParams = {}
): Promise<{ data: DebtWithCustomer[]; total: number }> {
  const where = {
    tenantId,
    ...(from ? { createdAt: { gte: from, ...(to ? { lte: to } : {}) } } : {})
  };
  const [data, total] = await prisma.$transaction([
    prisma.debt.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit, include: { customer: { select: { name: true } } } }),
    prisma.debt.count({ where }),
  ]);
  return { data, total };
}
