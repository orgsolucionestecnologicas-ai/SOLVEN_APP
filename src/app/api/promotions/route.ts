import {
  createPromotion,
  listPromotions,
  PromotionValidationError,
  type CreatePromotionInput
} from "../../../modules/promotions";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../_shared/responses";

export async function GET() {
  try {
    const promotions = await listPromotions();

    return successResponse(promotions);
  } catch {
    return errorResponse("No se pudieron cargar las promociones.");
  }
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Los datos de la promoción deben ser un objeto.", 400);
  }

  try {
    const promotion = await createPromotion(
      requestBody as CreatePromotionInput
    );

    return successResponse(promotion, 201);
  } catch (error) {
    if (error instanceof PromotionValidationError) {
      return errorResponse(
        "Datos de promoción inválidos.",
        400,
        error.reasons
      );
    }

    return errorResponse("No se pudo guardar la promoción.");
  }
}
