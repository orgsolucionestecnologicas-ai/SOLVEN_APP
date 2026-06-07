import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(
  message: string,
  status = 500,
  details?: string[]
) {
  return NextResponse.json(
    {
      error: {
        message,
        ...(details ? { details } : {})
      }
    },
    { status }
  );
}

export function invalidJsonResponse() {
  return errorResponse("Request body must be valid JSON.", 400);
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

export function isRequestObject(requestBody: unknown) {
  return (
    typeof requestBody === "object" &&
    requestBody !== null &&
    !Array.isArray(requestBody)
  );
}

export function isPrismaRecordNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}
