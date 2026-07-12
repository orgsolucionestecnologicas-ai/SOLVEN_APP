export const dynamic = 'force-dynamic';
import type { PromotionApplication } from "@prisma/client";

import { findOverlappingPromotions } from "../../../../modules/promotions";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

const VALID_APPLICATIONS = ["ALL_PRODUCTS", "CATEGORY", "SPECIFIC_PRODUCT", "BUNDLED"];

export async function POST(request: Request) {
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
    return errorResponse("Los datos deben ser un objeto.", 400);
  }

  const body = requestBody as {
    application?: string;
    categoryName?: string;
    productAId?: string;
    startsAt?: string;
    endsAt?: string;
    excludeId?: string;
  };

  if (!body.application || !VALID_APPLICATIONS.includes(body.application)) {
    return errorResponse("Aplicación de promoción inválida.", 400);
  }
  if (!body.startsAt || !body.endsAt || isNaN(Date.parse(body.startsAt)) || isNaN(Date.parse(body.endsAt))) {
    return errorResponse("Fechas de inicio y fin requeridas y válidas.", 400);
  }

  try {
    const overlapping = await findOverlappingPromotions(
      {
        application: body.application as PromotionApplication,
        categoryName: body.categoryName,
        productAId: body.productAId,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt)
      },
      tenantId,
      body.excludeId
    );
    return successResponse(overlapping);
  } catch {
    return errorResponse("No se pudo verificar el solapamiento de promociones.");
  }
}
