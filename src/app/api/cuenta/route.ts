export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant";
import { successResponse, errorResponse } from "../_shared/responses";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        businessName: true,
        email: true,
        subscription: {
          select: {
            status: true,
            trialEndsAt: true,
            currentPeriodEnd: true,
            rebillSubscriptionId: true,
            cancelledAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!tenant) return errorResponse("Tenant no encontrado.", 404);

    return successResponse({
      businessName: tenant.businessName,
      email: tenant.email,
      subscription: tenant.subscription,
    });
  } catch {
    return errorResponse("No se pudo cargar la información de la cuenta.");
  }
}
