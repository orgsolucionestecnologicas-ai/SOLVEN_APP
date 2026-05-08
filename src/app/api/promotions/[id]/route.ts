import {
  deletePromotion,
  getPromotionById,
  PromotionHasUsagesError,
  PromotionNotFoundError,
  PromotionValidationError,
  type UpdatePromotionInput,
  updatePromotion
} from "../../../../modules/promotions";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../../_shared/responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const promotion = await getPromotionById(id);

    return successResponse(promotion);
  } catch (error) {
    if (error instanceof PromotionNotFoundError) {
      return errorResponse(error.message, 404);
    }

    return errorResponse("No se pudo cargar la promoción.");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) {
    return errorResponse(
      "Los datos de actualización deben ser un objeto.",
      400
    );
  }

  try {
    const promotion = await updatePromotion(id, body as UpdatePromotionInput);

    return successResponse(promotion);
  } catch (error) {
    if (error instanceof PromotionValidationError) {
      return errorResponse(
        "Datos de promoción inválidos.",
        400,
        error.reasons
      );
    }

    if (error instanceof PromotionNotFoundError) {
      return errorResponse(error.message, 404);
    }

    return errorResponse("No se pudo actualizar la promoción.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deletePromotion(id);

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof PromotionNotFoundError) {
      return errorResponse(error.message, 404);
    }

    if (error instanceof PromotionHasUsagesError) {
      return errorResponse(error.message, 400);
    }

    return errorResponse("No se pudo eliminar la promoción.");
  }
}
