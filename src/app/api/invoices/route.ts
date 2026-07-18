export const dynamic = "force-dynamic";

import { emitInvoice } from "@/modules/invoices";
import { ARCAError } from "@/lib/arca";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "../_shared/responses";
import {
  ForbiddenError,
  requireRole,
  UnauthorizedError,
} from "@/lib/tenant";

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"], "pos"));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON inválido.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("El cuerpo debe ser un objeto JSON.", 400);
  }

  const { saleId, docTipo, docNro, concepto } = body as Record<string, unknown>;

  const ALLOWED_DOC_TIPOS = [99, 96, 80];

  if (typeof saleId !== "string" || !saleId) {
    return errorResponse("saleId es requerido.", 400);
  }
  if (typeof docTipo !== "number" || !ALLOWED_DOC_TIPOS.includes(docTipo)) {
    return errorResponse("docTipo inválido.", 400);
  }

  try {
    const invoice = await emitInvoice({
      tenantId,
      saleId,
      docTipo,
      docNro: typeof docNro === "string" ? docNro : "",
      concepto: typeof concepto === "number" ? concepto : undefined,
    });

    return successResponse(invoice, 201);
  } catch (e) {
    if (e instanceof ARCAError) {
      return errorResponse(e.message, 422, [e.code, e.detail].filter((v): v is string => Boolean(v)));
    }
    return errorResponse("Error interno al emitir factura.");
  }
}
