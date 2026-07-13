export const dynamic = 'force-dynamic';
import {
  deleteUser,
  setUserActive,
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
    const body = requestBody as { role?: string; active?: boolean };
    const user = typeof body.active === "boolean"
      ? await setUserActive(id, body.active, tenantId, userId)
      : await updateUserRole(id, { role: body.role ?? "" }, tenantId, userId);
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
