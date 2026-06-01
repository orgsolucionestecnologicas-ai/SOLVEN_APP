export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant";
import { errorResponse, successResponse } from "../_shared/responses";

export async function GET() {
  const tenantId = await requireTenantId();

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId }
    });

    if (!subscription) {
      return successResponse({ status: "TRIAL", trialEndsAt: null, daysLeft: null });
    }

    const daysLeft =
      subscription.trialEndsAt
        ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    return successResponse({
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      daysLeft
    });
  } catch {
    return errorResponse("No se pudo obtener la suscripción.");
  }
}
