import {
  CashRegisterAlreadyClosedError,
  CashRegisterSessionNotFoundError,
  CashRegisterValidationError,
  closeSession,
  getSessionById
} from "../../../../modules/cash-register";
import { errorResponse, successResponse } from "../../_shared/responses";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionById(id);
    return successResponse(session);
  } catch (err) {
    if (err instanceof CashRegisterSessionNotFoundError) {
      return errorResponse(err.message, 404);
    }
    return errorResponse("No se pudo obtener la sesión de caja.");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const session = await closeSession(id, body);
    return successResponse(session);
  } catch (err) {
    if (err instanceof CashRegisterValidationError) {
      return errorResponse(err.reasons.join(" "), 400);
    }
    if (err instanceof CashRegisterSessionNotFoundError) {
      return errorResponse(err.message, 404);
    }
    if (err instanceof CashRegisterAlreadyClosedError) {
      return errorResponse(err.message, 409);
    }
    return errorResponse("No se pudo cerrar la sesión de caja.");
  }
}
