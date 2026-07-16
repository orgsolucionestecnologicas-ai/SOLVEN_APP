export const dynamic = 'force-dynamic';
import { createSupplier, listSuppliers, SupplierValidationError } from "../../../modules/suppliers";
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
    const suppliers = await listSuppliers(tenantId);
    return successResponse(suppliers);
  } catch {
    return errorResponse("No se pudieron cargar los proveedores.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "INVENTORY"], "products"));
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
    return errorResponse("Los datos del proveedor deben ser un objeto.", 400);
  }

  try {
    const supplier = await createSupplier(body, tenantId);
    return successResponse(supplier, 201);
  } catch (error) {
    if (error instanceof SupplierValidationError) {
      return errorResponse("Datos de proveedor inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudo guardar el proveedor.");
  }
}
