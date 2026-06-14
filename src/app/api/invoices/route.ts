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
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"]));
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

  const { saleId, items, total, docTipo, docNro, concepto } = body as Record<string, unknown>;

  if (typeof saleId !== "string" || !saleId) {
    return errorResponse("saleId es requerido.", 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse("items es requerido y no puede estar vacío.", 400);
  }
  if (typeof total !== "number" || total <= 0) {
    return errorResponse("total inválido.", 400);
  }
  if (typeof docTipo !== "number") {
    return errorResponse("docTipo inválido.", 400);
  }

  try {
    const invoice = await emitInvoice({
      tenantId,
      saleId,
      items: items as Array<{ productName: string; quantity: number; unitPrice: number; ivaRate: number }>,
      total,
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
