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

export async function listExpenses(tenantId: string): Promise<Expense[]> {
  return prisma.expense.findMany({
    where: { tenantId },
    orderBy: { expenseDate: "desc" }
  });
}
