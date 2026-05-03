import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DebtPaymentAmountError,
  listDebtPayments,
  registerDebtPayment
} from "../../../modules/debts";
import { DebtPaymentValidationError } from "../../../modules/debts/debt-payment-validation";
import { GET, POST } from "./route";

vi.mock("../../../modules/debts", () => ({
  DebtPaymentAmountError: class DebtPaymentAmountError extends Error {
    constructor() {
      super("Debt payment amount cannot exceed remaining debt amount.");
      this.name = "DebtPaymentAmountError";
    }
  },
  listDebtPayments: vi.fn(),
  registerDebtPayment: vi.fn()
}));

const mockedListDebtPayments = vi.mocked(listDebtPayments);
const mockedRegisterDebtPayment = vi.mocked(registerDebtPayment);

describe("debt payments API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists debt payments", async () => {
    const debtPayments = [buildDebtPaymentRecord()];
    mockedListDebtPayments.mockResolvedValueOnce(debtPayments);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [debtPaymentJson] });
  });

  it("returns a server error when debt payments cannot be listed", async () => {
    mockedListDebtPayments.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "Could not load debt payments."
      }
    });
  });

  it("registers a debt payment", async () => {
    const debtPayment = buildDebtPaymentRecord();
    mockedRegisterDebtPayment.mockResolvedValueOnce(debtPayment);

    const response = await POST(
      new Request("http://localhost/api/debt-payments", {
        method: "POST",
        body: JSON.stringify({
          debtId: "debt-1",
          amount: 30
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: debtPaymentJson });
    expect(mockedRegisterDebtPayment).toHaveBeenCalledWith({
      debtId: "debt-1",
      amount: 30
    });
  });

  it("returns validation errors for invalid debt payment input", async () => {
    mockedRegisterDebtPayment.mockRejectedValueOnce(
      new DebtPaymentValidationError([
        "Debt payment amount must be a positive number."
      ])
    );

    const response = await POST(
      new Request("http://localhost/api/debt-payments", {
        method: "POST",
        body: JSON.stringify({
          debtId: "debt-1",
          amount: 0
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Invalid debt payment input.",
        details: ["Debt payment amount must be a positive number."]
      }
    });
  });

  it("returns an error when payment exceeds remaining debt amount", async () => {
    mockedRegisterDebtPayment.mockRejectedValueOnce(
      new DebtPaymentAmountError()
    );

    const response = await POST(
      new Request("http://localhost/api/debt-payments", {
        method: "POST",
        body: JSON.stringify({
          debtId: "debt-1",
          amount: 200
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Debt payment amount cannot exceed remaining debt amount."
      }
    });
  });

  it("returns an error when the debt does not exist", async () => {
    mockedRegisterDebtPayment.mockRejectedValueOnce(buildPrismaNotFoundError());

    const response = await POST(
      new Request("http://localhost/api/debt-payments", {
        method: "POST",
        body: JSON.stringify({
          debtId: "missing-debt",
          amount: 30
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Debt was not found."
      }
    });
  });
});

const debtPaymentJson = {
  id: "debt-payment-1",
  debtId: "debt-1",
  amount: "30.00",
  paymentDate: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function buildDebtPaymentRecord(): Awaited<
  ReturnType<typeof registerDebtPayment>
> {
  return {
    ...debtPaymentJson,
    paymentDate: new Date(debtPaymentJson.paymentDate),
    createdAt: new Date(debtPaymentJson.createdAt),
    updatedAt: new Date(debtPaymentJson.updatedAt)
  } as unknown as Awaited<ReturnType<typeof registerDebtPayment>>;
}

function buildPrismaNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "test"
  });
}
