export const dynamic = 'force-dynamic';
import {
  processReturn,
  ReturnValidationError,
  type ReturnItemInput
} from "../../../modules/returns";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../_shared/responses";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) {
    return errorResponse("El cuerpo de la solicitud debe ser un objeto.", 400);
  }

  const input = body as { saleId?: unknown; items?: unknown };

  if (typeof input.saleId !== "string" || input.saleId.trim().length === 0) {
    return errorResponse("El campo saleId es obligatorio.", 400);
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return errorResponse(
      "Debés seleccionar al menos un producto para devolver.",
      400
    );
  }

  for (const item of input.items as unknown[]) {
    const returnItem = item as { productId?: unknown; quantity?: unknown };

    if (
      typeof returnItem.productId !== "string" ||
      returnItem.productId.trim().length === 0
    ) {
      return errorResponse("Cada ítem debe tener un productId válido.", 400);
    }

    if (
      !Number.isInteger(returnItem.quantity) ||
      (returnItem.quantity as number) <= 0
    ) {
      return errorResponse(
        "La cantidad a devolver debe ser un entero positivo.",
        400
      );
    }
  }

  const returnItems = input.items as ReturnItemInput[];

  try {
    const result = await processReturn(input.saleId.trim(), returnItems);

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof ReturnValidationError) {
      return errorResponse(error.message, 400);
    }

    return errorResponse("No se pudo procesar la devolución.");
  }
}
