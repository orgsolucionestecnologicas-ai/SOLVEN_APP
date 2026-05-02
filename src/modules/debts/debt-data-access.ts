import type { Debt } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateDebtInput,
  validateCreateDebtInput
} from "./debt-validation";

export async function createDebt(debtInput: CreateDebtInput): Promise<Debt> {
  const validatedDebt = validateCreateDebtInput(debtInput);

  return prisma.debt.create({
    data: {
      customer: {
        connect: {
          id: validatedDebt.customerId
        }
      },
      totalAmount: validatedDebt.totalAmount,
      remainingAmount: validatedDebt.remainingAmount
    }
  });
}

export async function listDebts(): Promise<Debt[]> {
  return prisma.debt.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });
}
