export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/tenant";
import { errorResponse, invalidJsonResponse, successResponse } from "../../_shared/responses";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("No autorizado.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  const { password } = body as { password?: string };
  if (!password) return errorResponse("Contraseña requerida.", 400);

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await verifyPassword(password, user.password))) {
    return errorResponse("Contraseña incorrecta.", 401);
  }

  return successResponse({ valid: true });
}
