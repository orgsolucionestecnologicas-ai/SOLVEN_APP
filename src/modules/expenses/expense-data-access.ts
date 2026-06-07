import type { Expense } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { validateCreateCashMovementInput } from "../cash/cash-movement-validation";
import {
  type CreateExpenseInput,
  validateCreateExpenseInput
} from "./expense-validation";

export async function createExpense(
  expenseInput: CreateExpenseInput,
  tenantId: string
): Promise<Expense> {
  const validatedExpense = validateCreateExpenseInput(expenseInput);

  return prisma.$transaction(async (transaction) => {
    const expense = await transaction.expense.create({
      data: { ...validatedExpense, tenantId }
    });
    const cashMovement = validateCreateCashMovementInput({
      type: "OUT",
      amount: validatedExpense.amount,
      source: "EXPENSE",
      referenceId: expense.id
    });

    await transaction.cashMovement.create({
      data: { ...cashMovement, tenantId }
    });

    return expense;
  });
}

export type PaginationParams = { page?: number; limit?: number; from?: Date; to?: Date };

export async function listExpenses(
  tenantId: string,
  { page = 1, limit = 20, from, to }: PaginationParams = {}
): Promise<{ data: Expense[]; total: number }> {
  const where = {
    tenantId,
    ...(from ? { expenseDate: { gte: from, ...(to ? { lte: to } : {}) } } : {})
  };
  const [data, total] = await prisma.$transaction([
    prisma.expense.findMany({ where, orderBy: { expenseDate: "desc" }, take: limit, skip: (page - 1) * limit }),
    prisma.expense.count({ where }),
  ]);
  return { data, total };
}
