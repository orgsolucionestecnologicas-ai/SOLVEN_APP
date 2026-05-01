import { NextResponse } from "next/server";

import { createProduct, listProducts } from "../../../modules/products";
import {
  type CreateProductInput,
  ProductValidationError
} from "../../../modules/products/product-validation";

export async function GET() {
  const products = await listProducts();

  return NextResponse.json({ data: products });
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
          message: "Product input must be an object."
        }
      },
      { status: 400 }
    );
  }

  try {
    const product = await createProduct(requestBody as CreateProductInput);

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid product input.",
            details: error.reasons
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: "Could not save product."
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
