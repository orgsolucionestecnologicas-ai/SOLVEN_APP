import { NextResponse } from "next/server";

import { createDebt, listDebts } from "../../../modules/debts";
import {
  type CreateDebtInput,
  DebtValidationError
} from "../../../modules/debts/debt-validation";

export async function GET() {
  const debts = await listDebts();

  return NextResponse.json({ data: debts });
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
          message: "Debt input must be an object."
        }
      },
      { status: 400 }
    );
  }

  try {
    const debt = await createDebt(requestBody as CreateDebtInput);

    return NextResponse.json({ data: debt }, { status: 201 });
  } catch (error) {
    if (error instanceof DebtValidationError) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid debt input.",
            details: error.reasons
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: "Could not save debt."
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
