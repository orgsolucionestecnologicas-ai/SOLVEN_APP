export const dynamic = "force-dynamic";

import { createService, listServices } from "../../../modules/services";
import {
  type CreateServiceInput,
  ServiceValidationError
} from "../../../modules/services/service-validation";
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
  const tenantId = await requireTenantId();
  try {
    const services = await listServices(tenantId);
    return successResponse(services);
  } catch {
    return errorResponse("No se pudieron cargar los servicios.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "INVENTORY"]));
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
    return errorResponse("Los datos del servicio deben ser un objeto.", 400);
  }

  try {
    const service = await createService(requestBody as CreateServiceInput, tenantId);
    return successResponse(service, 201);
  } catch (error) {
    if (error instanceof ServiceValidationError) {
      return errorResponse("Datos de servicio inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudo guardar el servicio.");
  }
}
