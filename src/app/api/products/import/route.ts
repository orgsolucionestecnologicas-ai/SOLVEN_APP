export const dynamic = 'force-dynamic';
import { importProducts, type ImportProductRow } from "../../../../modules/products";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "INVENTORY"]));
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

  if (!isRequestObject(body) || !Array.isArray((body as { rows?: unknown }).rows)) {
    return errorResponse("Se requiere un array de filas para importar.", 400);
  }

  const rows = (body as { rows: unknown[] }).rows;
  if (rows.length === 0) {
    return errorResponse("El archivo no contiene filas para importar.", 400);
  }

  try {
    const result = await importProducts(rows as ImportProductRow[], tenantId);
    return successResponse(result);
  } catch {
    return errorResponse("No se pudo procesar la importación.");
  }
}
