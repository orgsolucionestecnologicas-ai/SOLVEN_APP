export const dynamic = 'force-dynamic';
import {
  deleteUser,
  updateUserRole,
  UserValidationError
} from "../../../../modules/users";
import {
  errorResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse
} from "../../_shared/responses";
import { requireRole } from "@/lib/tenant";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, { tenantId, userId }] = await Promise.all([params, requireRole(["OWNER"])]);

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
    const user = await updateUserRole(id, requestBody as { role: string }, tenantId, userId);
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, { tenantId, userId }] = await Promise.all([params, requireRole(["OWNER"])]);

  try {
    await deleteUser(id, tenantId, userId);
    return successResponse({ deleted: true });
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
