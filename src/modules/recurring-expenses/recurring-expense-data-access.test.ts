vi.mock("@/lib/prisma", () => ({
  prisma: {
    recurringExpense: { findMany: vi.fn(), update: vi.fn() }
  }
}));

vi.mock("../expenses/expense-data-access", () => ({
  createExpense: vi.fn()
}));

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createExpense } from "../expenses/expense-data-access";
import { generateDueRecurringExpenses } from "./recurring-expense-data-access";

const mockedFindMany = vi.mocked(prisma.recurringExpense.findMany);
const mockedUpdate = vi.mocked(prisma.recurringExpense.update);
const mockedCreateExpense = vi.mocked(createExpense);

function buildRecurringExpense(overrides: Partial<Record<string, unknown>> = {}) {
  const today = new Date().getDate();
  return {
    id: "recurring-1",
    tenantId: "tenant-1",
    category: "Alquiler",
    amount: new Prisma.Decimal("100"),
    description: null,
    dayOfMonth: today,
    active: true,
    lastGeneratedMonth: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

describe("generateDueRecurringExpenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates an expense for a due recurring expense and marks it as generated", async () => {
    const recurringExpense = buildRecurringExpense();
    mockedFindMany.mockResolvedValueOnce([recurringExpense] as never);
    mockedCreateExpense.mockResolvedValueOnce({ id: "expense-1" } as never);
    mockedUpdate.mockResolvedValueOnce(recurringExpense as never);

    const result = await generateDueRecurringExpenses();

    expect(result.generatedCount).toBe(1);
    expect(result.failures).toEqual([]);
    expect(mockedCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100, category: "Alquiler" }),
      "tenant-1"
    );
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
  });

  it("isolates a failure on one tenant so the rest of the tenants still get processed", async () => {
    const failingRecurringExpense = buildRecurringExpense({
      id: "recurring-fails",
      tenantId: "tenant-no-open-register"
    });
    const succeedingRecurringExpense = buildRecurringExpense({
      id: "recurring-succeeds",
      tenantId: "tenant-with-open-register"
    });

    mockedFindMany.mockResolvedValueOnce([failingRecurringExpense, succeedingRecurringExpense] as never);
    mockedCreateExpense
      .mockRejectedValueOnce(new Error("No hay una sesión de caja abierta."))
      .mockResolvedValueOnce({ id: "expense-2" } as never);
    mockedUpdate.mockResolvedValueOnce(succeedingRecurringExpense as never);

    const result = await generateDueRecurringExpenses();

    expect(result.generatedCount).toBe(1);
    expect(result.failures).toEqual([
      {
        recurringExpenseId: "recurring-fails",
        tenantId: "tenant-no-open-register",
        message: "No hay una sesión de caja abierta."
      }
    ]);
    // El tenant que falló no se marca como generado — sigue "due" para un próximo intento.
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "recurring-succeeds" } })
    );
    // El segundo tenant se procesó igual, sin que la falla del primero cortara el loop.
    expect(mockedCreateExpense).toHaveBeenCalledTimes(2);
  });

  it("skips a recurring expense whose day of month does not match today", async () => {
    const notDueToday = buildRecurringExpense({ dayOfMonth: -1 });
    mockedFindMany.mockResolvedValueOnce([notDueToday] as never);

    const result = await generateDueRecurringExpenses();

    expect(result.generatedCount).toBe(0);
    expect(result.failures).toEqual([]);
    expect(mockedCreateExpense).not.toHaveBeenCalled();
  });
});
