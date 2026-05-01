import { NextResponse } from "next/server";

import { createExpense, listExpenses } from "../../../modules/expenses";
import {
  type CreateExpenseInput,
  ExpenseValidationError
} from "../../../modules/expenses/expense-validation";

export async function GET() {
  const expenses = await listExpenses();

  return NextResponse.json({ data: expenses });
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
          message: "Expense input must be an object."
        }
      },
      { status: 400 }
    );
  }

  try {
    const expense = await createExpense(requestBody as CreateExpenseInput);

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    if (error instanceof ExpenseValidationError) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid expense input.",
            details: error.reasons
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: "Could not save expense."
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
