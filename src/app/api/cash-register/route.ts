export const dynamic = 'force-dynamic';
import { CashRegisterAlreadyOpenError, CashRegisterValidationError, getCurrentSession, openSession } from "../../../modules/cash-register";
import { errorResponse, successResponse } from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const session = await getCurrentSession(tenantId);
    return successResponse(session);
  } catch {
    return errorResponse("No se pudo obtener la sesión de caja.");
  }
}

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
  try {
    const body = await request.json();
    const session = await openSession(body, tenantId);
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
