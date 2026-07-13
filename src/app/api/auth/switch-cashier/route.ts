export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { COOKIE_MAX_AGE, COOKIE_NAME, createSession } from "@/lib/auth";
import { getSession } from "@/lib/tenant";
import { verifyUserPin } from "@/modules/users";
import { errorResponse, invalidJsonResponse, isRequestObject, successResponse } from "../../_shared/responses";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("No autorizado.", 401);

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Datos inválidos.", 400);
  }

  const { userId, pin } = requestBody as { userId?: string; pin?: string };

  if (!userId) {
    return errorResponse("Seleccioná un usuario.", 400);
  }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return errorResponse("El PIN debe tener 4 dígitos.", 400);
  }

  const cashier = await verifyUserPin(userId, pin, session.tenantId);
  if (!cashier) {
    return errorResponse("PIN incorrecto.", 401);
  }

  const token = await createSession(
    session.userId,
    session.tenantId,
    session.subscriptionStatus,
    session.trialEndsAt,
    session.role,
    cashier.id
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });

  return successResponse({
    activeCashier: { id: cashier.id, name: cashier.name, userCode: cashier.userCode }
  });
}
