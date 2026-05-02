import type { Expense } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { validateCreateCashMovementInput } from "../cash/cash-movement-validation";
import {
  type CreateExpenseInput,
  validateCreateExpenseInput
} from "./expense-validation";

export async function createExpense(
  expenseInput: CreateExpenseInput
): Promise<Expense> {
  const validatedExpense = validateCreateExpenseInput(expenseInput);

  return prisma.$transaction(async (transaction) => {
    const expense = await transaction.expense.create({
      data: validatedExpense
    });
    const cashMovement = validateCreateCashMovementInput({
      type: "OUT",
      amount: validatedExpense.amount,
      source: "EXPENSE",
      referenceId: expense.id
    });

    await transaction.cashMovement.create({
      data: cashMovement
    });

    return expense;
  });
}

export async function listExpenses(): Promise<Expense[]> {
  return prisma.expense.findMany({
    orderBy: {
      expenseDate: "desc"
    }
  });
}
