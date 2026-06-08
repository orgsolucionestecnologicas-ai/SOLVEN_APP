export const dynamic = 'force-dynamic';
import { CashRegisterAlreadyOpenError, CashRegisterValidationError, getCurrentSession, openSession, type OpenSessionInput } from "../../../modules/cash-register";
import { errorResponse, forbiddenResponse, invalidJsonResponse, successResponse, unauthorizedResponse } from "../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const session = await getCurrentSession(tenantId);
    return successResponse(session);
  } catch {
    return errorResponse("No se pudo obtener la sesión de caja.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  let body: OpenSessionInput;
  try {
    body = await request.json() as OpenSessionInput;
  } catch {
    return invalidJsonResponse();
  }
  try {
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
