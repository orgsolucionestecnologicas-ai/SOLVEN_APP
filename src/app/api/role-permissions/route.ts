export const dynamic = "force-dynamic";

import {
  listRolePermissions,
  RolePermissionValidationError,
  upsertRolePermissions,
  validateRolePermissionInputs
} from "@/modules/role-permissions";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
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
    const permissions = await listRolePermissions(tenantId);
    return successResponse(permissions);
  } catch {
    return errorResponse("No se pudieron cargar los permisos.");
  }
}

export async function PATCH(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
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

  if (!isRequestObject(requestBody) || !Array.isArray((requestBody as { permissions?: unknown }).permissions)) {
    return errorResponse("Debés enviar { permissions: [...] }.", 400);
  }

  try {
    const validated = validateRolePermissionInputs(
      (requestBody as { permissions: { role: string; section: string; canAccess: boolean }[] }).permissions
    );
    const permissions = await upsertRolePermissions(tenantId, validated);
    return successResponse(permissions);
  } catch (error) {
    if (error instanceof RolePermissionValidationError) {
      return errorResponse(error.reasons[0] ?? "Datos de permisos inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudieron actualizar los permisos.");
  }
}
