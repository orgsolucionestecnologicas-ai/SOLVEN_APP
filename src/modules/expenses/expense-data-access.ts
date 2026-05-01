import type { Expense } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateExpenseInput,
  validateCreateExpenseInput
} from "./expense-validation";

export async function createExpense(
  expenseInput: CreateExpenseInput
): Promise<Expense> {
  const validatedExpense = validateCreateExpenseInput(expenseInput);

  return prisma.expense.create({
    data: validatedExpense
  });
}

export async function listExpenses(): Promise<Expense[]> {
  return prisma.expense.findMany({
    orderBy: {
      expenseDate: "desc"
    }
  });
}
