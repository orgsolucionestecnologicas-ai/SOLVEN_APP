import { Prisma, type DebtPayment } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { validateCreateCashMovementInput } from "../cash/cash-movement-validation";
import {
  type RegisterDebtPaymentInput,
  validateRegisterDebtPaymentInput
} from "./debt-payment-validation";

export class DebtPaymentAmountError extends Error {
  constructor() {
    super("Debt payment amount cannot exceed remaining debt amount.");
    this.name = "DebtPaymentAmountError";
  }
}

export async function registerDebtPayment(
  paymentInput: RegisterDebtPaymentInput
): Promise<DebtPayment> {
  const validatedPayment = validateRegisterDebtPaymentInput(paymentInput);

  return prisma.$transaction(async (transaction) => {
    const debt = await transaction.debt.findUniqueOrThrow({
      where: {
        id: validatedPayment.debtId
      }
    });
    const paymentAmount = new Prisma.Decimal(validatedPayment.amount);

    if (paymentAmount.greaterThan(debt.remainingAmount)) {
      throw new DebtPaymentAmountError();
    }

    const debtUpdate = await transaction.debt.updateMany({
      where: {
        id: validatedPayment.debtId,
        remainingAmount: {
          gte: paymentAmount
        }
      },
      data: {
        remainingAmount: {
          decrement: paymentAmount
        }
      }
    });

    if (debtUpdate.count === 0) {
      throw new DebtPaymentAmountError();
    }

    const debtPayment = await transaction.debtPayment.create({
      data: {
        debt: {
          connect: {
            id: validatedPayment.debtId
          }
        },
        amount: validatedPayment.amount
      }
    });
    const cashMovement = validateCreateCashMovementInput({
      type: "IN",
      amount: validatedPayment.amount,
      source: "DEBT_PAYMENT",
      referenceId: debtPayment.id
    });

    await transaction.cashMovement.create({
      data: cashMovement
    });

    return debtPayment;
  });
}

export async function listDebtPayments(): Promise<DebtPayment[]> {
  return prisma.debtPayment.findMany({
    orderBy: {
      paymentDate: "desc"
    }
  });
}
