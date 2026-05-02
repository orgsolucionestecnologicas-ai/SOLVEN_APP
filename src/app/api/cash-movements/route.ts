import { NextResponse } from "next/server";

import {
  createCashMovement,
  listCashMovements
} from "../../../modules/cash";
import {
  CashMovementValidationError,
  type CreateCashMovementInput
} from "../../../modules/cash/cash-movement-validation";

export async function GET() {
  const cashMovements = await listCashMovements();

  return NextResponse.json({ data: cashMovements });
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
          message: "Cash movement input must be an object."
        }
      },
      { status: 400 }
    );
  }

  try {
    const cashMovement = await createCashMovement(
      requestBody as CreateCashMovementInput
    );

    return NextResponse.json({ data: cashMovement }, { status: 201 });
  } catch (error) {
    if (error instanceof CashMovementValidationError) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid cash movement input.",
            details: error.reasons
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: "Could not save cash movement."
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
