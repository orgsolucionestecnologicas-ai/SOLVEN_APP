export const dynamic = 'force-dynamic';
import { writeOffDebt } from "../../../../../modules/debts";
import { DebtValidationError } from "../../../../../modules/debts/debt-validation";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string, userId: string;
  try {
    const [paramsResult, role] = await Promise.all([params, requireRole(["OWNER"])]);
    id = paramsResult.id;
    tenantId = role.tenantId;
    userId = role.userId;
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Write-off input must be an object.", 400);
  }

  try {
    const debt = await writeOffDebt(id, (requestBody as { note: string }).note, tenantId);
    void logAudit({
      tenantId,
      userId,
      action: "DEBT_WRITTEN_OFF",
      entityType: "Debt",
      entityId: debt.id,
      metadata: { note: debt.writeOffNote }
    });
    return successResponse(debt);
  } catch (error) {
    if (error instanceof DebtValidationError) {
      return errorResponse(error.reasons[0] ?? "Datos inválidos.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Deuda no encontrada.", 404);
    }
    return errorResponse("No se pudo marcar la deuda como incobrable.");
  }
}
