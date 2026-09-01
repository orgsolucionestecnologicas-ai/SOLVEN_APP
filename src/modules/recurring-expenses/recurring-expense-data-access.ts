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

export type GenerateDueRecurringExpensesFailure = {
  recurringExpenseId: string;
  tenantId: string;
  message: string;
};

export type GenerateDueRecurringExpensesResult = {
  generatedCount: number;
  failures: GenerateDueRecurringExpensesFailure[];
};

export async function generateDueRecurringExpenses(): Promise<GenerateDueRecurringExpensesResult> {
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
  const failures: GenerateDueRecurringExpensesFailure[] = [];

  for (const recurringExpense of dueRecurringExpenses) {
    const effectiveDay = Math.min(recurringExpense.dayOfMonth, daysInMonth);
    if (effectiveDay !== currentDay) continue;

    // Aislado por tenant a propósito: si un tenant no tiene caja abierta (o
    // falla por cualquier otro motivo), no debe cortar el procesamiento del
    // resto de los tenants en la misma corrida del cron. Ver TAREAS/PENDIENTES.md
    // ("Cron de gastos recurrentes puede abortar para TODOS los tenants").
    try {
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
    } catch (error) {
      failures.push({
        recurringExpenseId: recurringExpense.id,
        tenantId: recurringExpense.tenantId,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return { generatedCount, failures };
}
