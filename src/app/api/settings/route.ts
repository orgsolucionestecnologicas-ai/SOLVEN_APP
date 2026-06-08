export const dynamic = "force-dynamic";

import { getSettings, upsertSettings } from "../../../modules/settings";
import {
  SettingsValidationError,
  type UpsertSettingsInput
} from "../../../modules/settings/settings-validation";
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
    const settings = await getSettings(tenantId);
    return successResponse(settings);
  } catch {
    return errorResponse("No se pudo cargar la configuración.");
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

  if (!isRequestObject(requestBody)) {
    return errorResponse("La configuración debe ser un objeto.", 400);
  }

  try {
    const settings = await upsertSettings(requestBody as UpsertSettingsInput, tenantId);
    return successResponse(settings);
  } catch (error) {
    if (error instanceof SettingsValidationError) {
      return errorResponse("Datos de configuración inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudo guardar la configuración.");
  }
}
