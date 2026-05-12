export const dynamic = 'force-dynamic';
import { CashRegisterAlreadyOpenError, CashRegisterValidationError, getCurrentSession, openSession } from "../../../modules/cash-register";
import { errorResponse, successResponse } from "../_shared/responses";

export async function GET() {
  try {
    const session = await getCurrentSession();
    return successResponse(session);
  } catch {
    return errorResponse("No se pudo obtener la sesión de caja.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await openSession(body);
    return successResponse(session, 201);
  } catch (err) {
    if (err instanceof CashRegisterValidationError) {
      return errorResponse(err.reasons.join(" "), 400);
    }
    if (err instanceof CashRegisterAlreadyOpenError) {
      return errorResponse(err.message, 409);
    }
    return errorResponse("No se pudo abrir la sesión de caja.");
  }
}
