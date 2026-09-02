export const dynamic = 'force-dynamic';
import {
  applyPromotionsToCart,
  type CartItem,
  getActivePromotions,
  getPromotionByCode
} from "../../../../modules/promotions";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

type ApplyRequest = {
  cartItems: CartItem[];
  promotionCodes?: string[];
  customerId?: string;
};

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Los datos del carrito deben ser un objeto.", 400);
  }

  const body = requestBody as ApplyRequest;

  if (!Array.isArray(body.cartItems) || body.cartItems.length === 0) {
    return errorResponse("El carrito debe contener al menos un producto.", 400);
  }

  try {
    const activePromotions = await getActivePromotions(tenantId);
    const promotionSet = new Map(activePromotions.map((p) => [p.id, p]));

    if (Array.isArray(body.promotionCodes) && body.promotionCodes.length > 0) {
      for (const code of body.promotionCodes) {
        const byCode = await getPromotionByCode(code, tenantId);
        if (byCode && !promotionSet.has(byCode.id)) {
          promotionSet.set(byCode.id, byCode);
        }
      }
    }

    const customerSegment = body.customerId
      ? (
          await prisma.customer.findFirst({
            where: { id: body.customerId, tenantId },
            select: { segment: true }
          })
        )?.segment
      : undefined;

    const result = applyPromotionsToCart(
      body.cartItems,
      [...promotionSet.values()],
      body.customerId,
      customerSegment
    );

    return successResponse(result);
  } catch {
    return errorResponse("No se pudieron aplicar las promociones.");
  }
}
