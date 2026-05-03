import { beforeEach, describe, expect, it, vi } from "vitest";

import { createExpense, listExpenses } from "../../../modules/expenses";
import { ExpenseValidationError } from "../../../modules/expenses/expense-validation";
import { GET, POST } from "./route";

vi.mock("../../../modules/expenses", () => ({
  createExpense: vi.fn(),
  listExpenses: vi.fn()
}));

const mockedCreateExpense = vi.mocked(createExpense);
const mockedListExpenses = vi.mocked(listExpenses);

describe("expenses API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists expenses", async () => {
    const expenses = [buildExpenseRecord()];
    mockedListExpenses.mockResolvedValueOnce(expenses);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [expenseJson] });
  });

  it("returns a server error when expenses cannot be listed", async () => {
    mockedListExpenses.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "Could not load expenses."
      }
    });
  });

  it("creates an expense", async () => {
    const expense = buildExpenseRecord();
    mockedCreateExpense.mockResolvedValueOnce(expense);

    const response = await POST(
      new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: 25.5,
          category: "Supplies",
          description: "Printer paper"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: expenseJson });
    expect(mockedCreateExpense).toHaveBeenCalledWith({
      amount: 25.5,
      category: "Supplies",
      description: "Printer paper"
    });
  });

  it("returns validation errors for invalid expense input", async () => {
    mockedCreateExpense.mockRejectedValueOnce(
      new ExpenseValidationError(["Expense amount must be a positive number."])
    );

    const response = await POST(
      new Request("http://localhost/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: 0,
          category: "Supplies",
          description: "Printer paper"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Invalid expense input.",
        details: ["Expense amount must be a positive number."]
      }
    });
  });
});

const expenseJson = {
  id: "expense-1",
  amount: "25.50",
  category: "Supplies",
  description: "Printer paper",
  expenseDate: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function buildExpenseRecord(): Awaited<ReturnType<typeof createExpense>> {
  return {
    ...expenseJson,
    expenseDate: new Date(expenseJson.expenseDate),
    createdAt: new Date(expenseJson.createdAt),
    updatedAt: new Date(expenseJson.updatedAt)
  } as unknown as Awaited<ReturnType<typeof createExpense>>;
}
