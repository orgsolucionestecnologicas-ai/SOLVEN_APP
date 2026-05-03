import type { Debt } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateDebtInput,
  validateCreateDebtInput
} from "./debt-validation";

export type DebtWithCustomer = Debt & { customer: { name: string } };

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

export async function listDebts(): Promise<DebtWithCustomer[]> {
  return prisma.debt.findMany({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      customer: {
        select: { name: true }
      }
    }
  });
}
