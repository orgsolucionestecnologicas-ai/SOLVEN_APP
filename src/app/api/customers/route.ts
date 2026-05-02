import { NextResponse } from "next/server";

import { createCustomer, listCustomers } from "../../../modules/customers";
import {
  type CreateCustomerInput,
  CustomerValidationError
} from "../../../modules/customers/customer-validation";

export async function GET() {
  const customers = await listCustomers();

  return NextResponse.json({ data: customers });
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
          message: "Customer input must be an object."
        }
      },
      { status: 400 }
    );
  }

  try {
    const customer = await createCustomer(requestBody as CreateCustomerInput);

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerValidationError) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid customer input.",
            details: error.reasons
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: "Could not save customer."
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
