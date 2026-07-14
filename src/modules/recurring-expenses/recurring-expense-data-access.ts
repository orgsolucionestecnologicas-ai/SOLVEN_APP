import type { RecurringExpense } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { createExpense } from "../expenses/expense-data-access";
import {
  type CreateRecurringExpenseInput,
  validateCreateRecurringExpenseInput
} from "./recurring-expense-validation";

export async function createRecurringExpense(
  recurringExpenseInput: CreateRecurringExpenseInput,
  tenantId: string
): Promise<RecurringExpense> {
  const validatedRecurringExpense = validateCreateRecurringExpenseInput(recurringExpenseInput);

  return prisma.recurringExpense.create({
    data: { ...validatedRecurringExpense, tenantId }
  });
}

export async function listRecurringExpenses(tenantId: string): Promise<RecurringExpense[]> {
  return prisma.recurringExpense.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" }
  });
}

export async function generateDueRecurringExpenses(): Promise<number> {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const dueRecurringExpenses = await prisma.recurringExpense.findMany({
    where: {
      active: true,
      OR: [{ lastGeneratedMonth: null }, { lastGeneratedMonth: { not: currentMonthKey } }]
    }
  });

  let generatedCount = 0;

  for (const recurringExpense of dueRecurringExpenses) {
    const effectiveDay = Math.min(recurringExpense.dayOfMonth, daysInMonth);
    if (effectiveDay !== currentDay) continue;

    await createExpense(
      {
        amount: recurringExpense.amount.toNumber(),
        category: recurringExpense.category,
        description: recurringExpense.description ?? recurringExpense.category
      },
      recurringExpense.tenantId
    );

    await prisma.recurringExpense.update({
      where: { id: recurringExpense.id },
      data: { lastGeneratedMonth: currentMonthKey }
    });

    generatedCount++;
  }

  return generatedCount;
}
