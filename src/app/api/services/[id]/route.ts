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
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse
} from "../../_shared/responses";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
    const service = await updateService(id, body as UpdateServiceInput);
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
  const { id } = await params;

  try {
    const service = await toggleServiceActive(id);
    return successResponse(service);
  } catch (error) {
    if (error instanceof ServiceNotFoundError) {
      return errorResponse("Servicio no encontrado.", 404);
    }
    return errorResponse("No se pudo actualizar el servicio.");
  }
}
