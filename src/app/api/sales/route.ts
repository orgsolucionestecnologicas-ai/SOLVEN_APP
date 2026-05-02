import { NextResponse } from "next/server";

import {
  createSale,
  listSales,
  SaleInsufficientStockError,
  SaleProductNotFoundError
} from "../../../modules/sales";
import {
  type CreateSaleInput,
  SaleValidationError
} from "../../../modules/sales/sale-validation";

export async function GET() {
  const sales = await listSales();

  return NextResponse.json({ data: sales });
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
          message: "Sale input must be an object."
        }
      },
      { status: 400 }
    );
  }

  try {
    const sale = await createSale(requestBody as CreateSaleInput);

    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid sale input.",
            details: error.reasons
          }
        },
        { status: 400 }
      );
    }

    if (
      error instanceof SaleProductNotFoundError ||
      error instanceof SaleInsufficientStockError
    ) {
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
          message: "Could not save sale."
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
