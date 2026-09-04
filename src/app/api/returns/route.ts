export const dynamic = 'force-dynamic';
import { ReturnReasonCategory } from "@prisma/client";

import {
  listReturns,
  processReturn,
  ReturnConcurrentConflictError,
  RETURN_REASON_CATEGORIES,
  RETURN_REFUND_METHODS,
  ReturnValidationError,
  type ReturnItemInput,
  type RefundDetailInput
} from "../../../modules/returns";
import { SaleNoCashRegisterOpenError } from "../../../modules/sales";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  paginatedResponse,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"], "returns"));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const sellerIdParam = searchParams.get("sellerId");
  const reasonCategoryParam = searchParams.get("reasonCategory");
  const searchParam = searchParams.get("search");

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : undefined;
  const sellerId = sellerIdParam && sellerIdParam.trim().length > 0 ? sellerIdParam.trim() : undefined;
  const search = searchParam && searchParam.trim().length > 0 ? searchParam.trim() : undefined;

  if (reasonCategoryParam && !RETURN_REASON_CATEGORIES.includes(reasonCategoryParam as ReturnReasonCategory)) {
    return errorResponse("El motivo de la devolución es inválido.", 400);
  }
  const reasonCategory = reasonCategoryParam ? (reasonCategoryParam as ReturnReasonCategory) : undefined;

  try {
    const result = await listReturns(tenantId, {
      page,
      limit,
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      sellerId,
      reasonCategory,
      search
    });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar las devoluciones.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  let userId: string;
  try {
    ({ tenantId, userId } = await requireRole(["OWNER", "CASHIER"], "returns"));
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
    return errorResponse("El cuerpo de la solicitud debe ser un objeto.", 400);
  }

  const input = body as {
    saleId?: unknown;
    items?: unknown;
    reasonCategory?: unknown;
    reasonNote?: unknown;
    refundDetails?: unknown;
  };

  if (typeof input.saleId !== "string" || input.saleId.trim().length === 0) {
    return errorResponse("El campo saleId es obligatorio.", 400);
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return errorResponse("Debés seleccionar al menos un producto para devolver.", 400);
  }

  if (
    typeof input.reasonCategory !== "string" ||
    !RETURN_REASON_CATEGORIES.includes(input.reasonCategory as ReturnReasonCategory)
  ) {
    return errorResponse("El motivo de la devolución es obligatorio.", 400);
  }

  if (input.reasonNote !== undefined && typeof input.reasonNote !== "string") {
    return errorResponse("La nota del motivo debe ser texto.", 400);
  }

  const cleanRefundDetails: RefundDetailInput[] = [];
  if (input.refundDetails !== undefined) {
    if (!Array.isArray(input.refundDetails)) {
      return errorResponse("El reintegro debe ser una lista.", 400);
    }
    for (const rawDetail of input.refundDetails as unknown[]) {
      const detail = rawDetail as { method?: unknown; amount?: unknown; reference?: unknown };

      if (
        typeof detail.method !== "string" ||
        !RETURN_REFUND_METHODS.includes(detail.method as (typeof RETURN_REFUND_METHODS)[number])
      ) {
        return errorResponse("El método de reintegro elegido no es válido.", 400);
      }

      if (typeof detail.amount !== "number" || !Number.isFinite(detail.amount) || detail.amount <= 0) {
        return errorResponse("El monto a reintegrar debe ser un número positivo.", 400);
      }

      if (detail.reference !== undefined && typeof detail.reference !== "string") {
        return errorResponse("El número de operación debe ser texto.", 400);
      }

      if (detail.method === "Tarjeta" && (typeof detail.reference !== "string" || detail.reference.trim().length === 0)) {
        return errorResponse("Debés indicar el número de operación o cupón de la tarjeta.", 400);
      }

      cleanRefundDetails.push({
        method: detail.method,
        amount: detail.amount,
        reference: typeof detail.reference === "string" ? detail.reference.trim() : undefined
      });
    }
  }

  for (const item of input.items as unknown[]) {
    const returnItem = item as { productId?: unknown; quantity?: unknown; restock?: unknown };

    if (
      typeof returnItem.productId !== "string" ||
      returnItem.productId.trim().length === 0
    ) {
      return errorResponse("Cada ítem debe tener un productId válido.", 400);
    }

    if (
      !Number.isInteger(returnItem.quantity) ||
      (returnItem.quantity as number) <= 0
    ) {
      return errorResponse("La cantidad a devolver debe ser un entero positivo.", 400);
    }

    if (returnItem.restock !== undefined && typeof returnItem.restock !== "boolean") {
      return errorResponse("El campo restock debe ser booleano.", 400);
    }
  }

  const returnItems = input.items as ReturnItemInput[];

  try {
    const result = await processReturn(
      input.saleId.trim(),
      returnItems,
      tenantId,
      input.reasonCategory as ReturnReasonCategory,
      input.reasonNote as string | undefined,
      cleanRefundDetails
    );
    void logAudit({
      tenantId,
      userId,
      action: "RETURN_CREATED",
      entityType: "Return",
      entityId: result.returnId,
      metadata: {
        saleId: result.saleId,
        totalReturned: result.totalReturned,
        refundMethods: cleanRefundDetails.map((d) => d.method)
      }
    });
    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof ReturnValidationError) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof SaleNoCashRegisterOpenError) {
      return errorResponse(error.message, 409);
    }
    if (error instanceof ReturnConcurrentConflictError) {
      return errorResponse(error.message, 409);
    }
    return errorResponse("No se pudo procesar la devolución.");
  }
}
