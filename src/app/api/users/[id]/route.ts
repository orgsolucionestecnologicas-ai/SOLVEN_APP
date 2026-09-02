export const dynamic = 'force-dynamic';
import {
  deleteUser,
  setUserActive,
  updateUserAvatar,
  updateUserPin,
  updateUserRole,
  UserValidationError
} from "../../../../modules/users";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string, userId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER"])]));
    ({ tenantId, userId } = role);
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
    return errorResponse("User update input must be an object.", 400);
  }

  try {
    const body = requestBody as { role?: string; active?: boolean; avatarUrl?: string | null; pin?: string | null };
    let user;
    if (typeof body.active === "boolean") {
      user = await setUserActive(id, body.active, tenantId, userId);
      void logAudit({
        tenantId,
        userId,
        action: body.active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityType: "User",
        entityId: id
      });
    } else if (typeof body.avatarUrl !== "undefined") {
      user = await updateUserAvatar(id, body.avatarUrl, tenantId);
    } else if (typeof body.pin !== "undefined") {
      user = await updateUserPin(id, body.pin, tenantId);
      void logAudit({
        tenantId,
        userId,
        action: "USER_PIN_CHANGED",
        entityType: "User",
        entityId: id
      });
    } else {
      user = await updateUserRole(id, { role: body.role ?? "" }, tenantId, userId);
      void logAudit({
        tenantId,
        userId,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: id,
        metadata: { newRole: user.role }
      });
    }
    return successResponse(user);
  } catch (error) {
    if (error instanceof UserValidationError) {
      return errorResponse(error.reasons[0] ?? "Datos de usuario inválidos.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Usuario no encontrado.", 404);
    }
    return errorResponse("No se pudo actualizar el usuario.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string, userId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER"])]));
    ({ tenantId, userId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const confirmed = new URL(request.url).searchParams.get("confirm") === "true";

  try {
    const result = await deleteUser(id, tenantId, userId, confirmed);
    if (result.deleted) {
      void logAudit({
        tenantId,
        userId,
        action: "USER_DELETED",
        entityType: "User",
        entityId: id,
        metadata: { salesCount: result.salesCount }
      });
    }
    return successResponse(result);
  } catch (error) {
    if (error instanceof UserValidationError) {
      return errorResponse(error.reasons[0] ?? "No se pudo eliminar el usuario.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Usuario no encontrado.", 404);
    }
    return errorResponse("No se pudo eliminar el usuario.");
  }
}
