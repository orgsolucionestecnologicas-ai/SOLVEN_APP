export const dynamic = 'force-dynamic';
import {
  CashRegisterAlreadyClosedError,
  CashRegisterSessionNotFoundError,
  CashRegisterValidationError,
  closeSession,
  getSessionById
} from "../../../../modules/cash-register";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "../../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let id: string, tenantId: string;
  try {
    ([{ id }, tenantId] = await Promise.all([params, requireTenantId()]));
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const session = await getSessionById(id, tenantId);
    return successResponse(session);
  } catch (err) {
    if (err instanceof CashRegisterSessionNotFoundError) {
      return errorResponse(err.message, 404);
    }
    return errorResponse("No se pudo obtener la sesión de caja.");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let id: string, tenantId: string, userId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER", "CASHIER"])]));
    ({ tenantId, userId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const body = await request.json();
    const session = await closeSession(id, body, tenantId);
    void logAudit({
      tenantId,
      userId,
      action: "CASH_REGISTER_CLOSED",
      entityType: "CashRegisterSession",
      entityId: session.id,
      metadata: { closingAmount: session.closingAmount?.toString() ?? null }
    });
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
