import type { Debt } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateDebtInput,
  DebtValidationError,
  validateCreateDebtInput
} from "./debt-validation";

export type DebtWithCustomer = Debt & { customer: { name: string; phone: string | null } };

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

export async function writeOffDebt(
  id: string,
  note: string,
  tenantId: string
): Promise<Debt> {
  const trimmedNote = typeof note === "string" ? note.trim() : "";
  if (trimmedNote.length === 0) {
    throw new DebtValidationError(["Write-off note is required."]);
  }

  return prisma.debt.update({
    where: { id, tenantId },
    data: {
      writtenOff: true,
      writeOffNote: trimmedNote,
      writeOffAt: new Date()
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
    prisma.debt.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit, include: { customer: { select: { name: true, phone: true } } } }),
    prisma.debt.count({ where }),
  ]);
  return { data, total };
}
