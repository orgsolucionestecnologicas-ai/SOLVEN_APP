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
    if (validatedExpense.supplierId) {
      const supplier = await transaction.supplier.findFirst({
        where: { id: validatedExpense.supplierId, tenantId }
      });
      if (!supplier) throw new Error("Proveedor no encontrado.");
    }

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

export type ExpenseWithSupplier = Expense & { supplier: { name: string } | null };

export async function listExpenses(
  tenantId: string,
  { page = 1, limit = 20, from, to }: PaginationParams = {}
): Promise<{ data: ExpenseWithSupplier[]; total: number }> {
  const where = {
    tenantId,
    ...(from ? { expenseDate: { gte: from, ...(to ? { lte: to } : {}) } } : {})
  };
  const [data, total] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: { supplier: { select: { name: true } } }
    }),
    prisma.expense.count({ where }),
  ]);
  return { data, total };
}
