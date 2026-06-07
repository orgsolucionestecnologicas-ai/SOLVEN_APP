export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant";
import { successResponse, errorResponse } from "../../_shared/responses";

export async function POST() {
  const tenantId = await requireTenantId();
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingCompleted: true },
    });
    return successResponse({ ok: true });
  } catch {
    return errorResponse("Error al completar el onboarding.");
  }
}
