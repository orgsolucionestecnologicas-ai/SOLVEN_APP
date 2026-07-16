export const dynamic = 'force-dynamic';
import { ReturnReasonCategory } from "@prisma/client";

import {
  listReturns,
  processReturn,
  RETURN_REASON_CATEGORIES,
  ReturnValidationError,
  type ReturnItemInput
} from "../../../modules/returns";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  paginatedResponse,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const sellerIdParam = searchParams.get("sellerId");

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : undefined;
  const sellerId = sellerIdParam && sellerIdParam.trim().length > 0 ? sellerIdParam.trim() : undefined;

  try {
    const result = await listReturns(tenantId, {
      page,
      limit,
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      sellerId
    });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar las devoluciones.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"], "returns"));
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
      input.reasonNote as string | undefined
    );
    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof ReturnValidationError) {
      return errorResponse(error.message, 400);
    }
    return errorResponse("No se pudo procesar la devolución.");
  }
}
