vi.mock("@/lib/prisma", () => ({
  prisma: {
    recurringExpense: { findMany: vi.fn(), update: vi.fn() }
  }
}));

vi.mock("../expenses/expense-data-access", () => ({
  createExpense: vi.fn()
}));

import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createExpense } from "../expenses/expense-data-access";
import { generateDueRecurringExpenses } from "./recurring-expense-data-access";

const mockedFindMany = vi.mocked(prisma.recurringExpense.findMany);
const mockedUpdate = vi.mocked(prisma.recurringExpense.update);
const mockedCreateExpense = vi.mocked(createExpense);

// "Hoy" fijo para que las pruebas de día-del-mes sean deterministas sin
// depender de cuándo se corra la suite.
const FAKE_TODAY = new Date("2026-09-15T12:00:00Z");

function buildRecurringExpense(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "recurring-1",
    tenantId: "tenant-1",
    category: "Alquiler",
    amount: new Prisma.Decimal("100"),
    description: null,
    dayOfMonth: 15,
    method: null,
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
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("passes the recurring expense's own payment method through to createExpense", async () => {
    const recurringExpense = buildRecurringExpense({ method: "Transferencia" });
    mockedFindMany.mockResolvedValueOnce([recurringExpense] as never);
    mockedCreateExpense.mockResolvedValueOnce({ id: "expense-1" } as never);
    mockedUpdate.mockResolvedValueOnce(recurringExpense as never);

    await generateDueRecurringExpenses();

    expect(mockedCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({ method: "Transferencia" }),
      "tenant-1"
    );
  });

  it("falls back to undefined (createExpense's own Efectivo default) for legacy recurring expenses without a method", async () => {
    const recurringExpense = buildRecurringExpense({ method: null });
    mockedFindMany.mockResolvedValueOnce([recurringExpense] as never);
    mockedCreateExpense.mockResolvedValueOnce({ id: "expense-1" } as never);
    mockedUpdate.mockResolvedValueOnce(recurringExpense as never);

    await generateDueRecurringExpenses();

    expect(mockedCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({ method: undefined }),
      "tenant-1"
    );
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

  it("does not generate a recurring expense whose day of month has not arrived yet this month", async () => {
    const notDueYet = buildRecurringExpense({ dayOfMonth: 20 }); // hoy es 15
    mockedFindMany.mockResolvedValueOnce([notDueYet] as never);

    const result = await generateDueRecurringExpenses();

    expect(result.generatedCount).toBe(0);
    expect(result.failures).toEqual([]);
    expect(mockedCreateExpense).not.toHaveBeenCalled();
  });

  it("catches up a recurring expense whose day already passed this month and was never generated", async () => {
    // Simula el caso real que motivó este cambio: el día 10 el cron no pudo
    // generarlo (caja cerrada, outage, etc.) y sigue "due" — el 15 lo toma
    // en vez de esperar hasta el mes que viene.
    const missedEarlierThisMonth = buildRecurringExpense({ dayOfMonth: 10, lastGeneratedMonth: null });
    mockedFindMany.mockResolvedValueOnce([missedEarlierThisMonth] as never);
    mockedCreateExpense.mockResolvedValueOnce({ id: "expense-1" } as never);
    mockedUpdate.mockResolvedValueOnce(missedEarlierThisMonth as never);

    const result = await generateDueRecurringExpenses();

    expect(result.generatedCount).toBe(1);
    expect(mockedCreateExpense).toHaveBeenCalledTimes(1);
  });
});
