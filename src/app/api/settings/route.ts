export const dynamic = "force-dynamic";

import { getSettings, upsertSettings } from "../../../modules/settings";
import {
  SettingsValidationError,
  type UpsertSettingsInput
} from "../../../modules/settings/settings-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../_shared/responses";
import { requireRole, requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const settings = await getSettings(tenantId);
    return successResponse(settings);
  } catch {
    return errorResponse("No se pudo cargar la configuración.");
  }
}

export async function PATCH(request: Request) {
  const { tenantId } = await requireRole(["OWNER"]);
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
