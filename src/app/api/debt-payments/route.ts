import { NextResponse } from "next/server";

import {
  DebtPaymentAmountError,
  listDebtPayments,
  registerDebtPayment
} from "../../../modules/debts";
import {
  DebtPaymentValidationError,
  type RegisterDebtPaymentInput
} from "../../../modules/debts/debt-payment-validation";

export async function GET() {
  const debtPayments = await listDebtPayments();

  return NextResponse.json({ data: debtPayments });
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "Request body must be valid JSON."
        }
      },
      { status: 400 }
    );
  }

  if (!isRequestObject(requestBody)) {
    return NextResponse.json(
      {
        error: {
          message: "Debt payment input must be an object."
        }
      },
      { status: 400 }
    );
  }

  try {
    const debtPayment = await registerDebtPayment(
      requestBody as RegisterDebtPaymentInput
    );

    return NextResponse.json({ data: debtPayment }, { status: 201 });
  } catch (error) {
    if (error instanceof DebtPaymentValidationError) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid debt payment input.",
            details: error.reasons
          }
        },
        { status: 400 }
      );
    }

    if (error instanceof DebtPaymentAmountError) {
      return NextResponse.json(
        {
          error: {
            message: error.message
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: "Could not save debt payment."
        }
      },
      { status: 500 }
    );
  }
}

function isRequestObject(requestBody: unknown) {
  return (
    typeof requestBody === "object" &&
    requestBody !== null &&
    !Array.isArray(requestBody)
  );
}
