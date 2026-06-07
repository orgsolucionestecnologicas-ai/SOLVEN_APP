export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "../_shared/responses";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("solven_session")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return errorResponse("No autorizado.", 401);
  }

  try {
    const [tenant, user] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { businessName: true }
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true, role: true }
      })
    ]);

    return successResponse({
      name: user?.name?.trim() || user?.email || "",
      businessName: tenant?.businessName ?? "",
      role: user?.role ?? session.role
    });
  } catch {
    return errorResponse("No se pudo cargar la información del usuario.");
  }
}
