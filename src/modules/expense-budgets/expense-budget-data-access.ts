import type { ExpenseBudget } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type UpsertExpenseBudgetInput,
  validateUpsertExpenseBudgetInput
} from "./expense-budget-validation";

export async function upsertExpenseBudget(
  budgetInput: UpsertExpenseBudgetInput,
  tenantId: string
): Promise<ExpenseBudget> {
  const validatedBudget = validateUpsertExpenseBudgetInput(budgetInput);

  return prisma.expenseBudget.upsert({
    where: { tenantId_category: { tenantId, category: validatedBudget.category } },
    create: { ...validatedBudget, tenantId },
    update: { monthlyLimit: validatedBudget.monthlyLimit }
  });
}

export async function listExpenseBudgets(tenantId: string): Promise<ExpenseBudget[]> {
  return prisma.expenseBudget.findMany({ where: { tenantId }, orderBy: { category: "asc" } });
}
