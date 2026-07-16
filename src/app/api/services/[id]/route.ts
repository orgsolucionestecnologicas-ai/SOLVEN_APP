export const dynamic = "force-dynamic";

import {
  ServiceNotFoundError,
  toggleServiceActive,
  updateService
} from "../../../../modules/services";
import {
  ServiceValidationError,
  type UpdateServiceInput
} from "../../../../modules/services/service-validation";
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER", "INVENTORY"], "products")]));
    ({ tenantId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) {
    return errorResponse("Los datos del servicio deben ser un objeto.", 400);
  }

  try {
    const service = await updateService(id, body as UpdateServiceInput, tenantId);
    return successResponse(service);
  } catch (error) {
    if (error instanceof ServiceValidationError) {
      return errorResponse("Datos de servicio inválidos.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Servicio no encontrado.", 404);
    }
    return errorResponse("No se pudo actualizar el servicio.");
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string, tenantId: string;
  try {
    let role: { tenantId: string; userId: string; role: string };
    ([{ id }, role] = await Promise.all([params, requireRole(["OWNER", "INVENTORY"], "products")]));
    ({ tenantId } = role);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const service = await toggleServiceActive(id, tenantId);
    return successResponse(service);
  } catch (error) {
    if (error instanceof ServiceNotFoundError) {
      return errorResponse("Servicio no encontrado.", 404);
    }
    return errorResponse("No se pudo actualizar el servicio.");
  }
}
