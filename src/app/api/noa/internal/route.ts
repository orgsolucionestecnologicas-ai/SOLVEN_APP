import { NextRequest, NextResponse } from "next/server";

import { answerNoaQuestion } from "@/lib/noa-responses";
import { getSession, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_MESSAGE_LENGTH = 1000;

const rateLimitByTenant = new Map<string, number[]>();

type RequestBody = {
  message?: unknown;
  context?: {
    page?: unknown;
  };
};

function isRateLimited(tenantId: string) {
  const now = Date.now();
  const timestamps = (rateLimitByTenant.get(tenantId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitByTenant.set(tenantId, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitByTenant.set(tenantId, timestamps);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (isRateLimited(session.tenantId)) {
      return NextResponse.json(
        { error: "Demasiadas consultas seguidas. Espera un minuto e intenta de nuevo." },
        { status: 429 }
      );
    }

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
    }

    if (typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ error: "El mensaje es requerido" }, { status: 400 });
    }

    const page = typeof body.context?.page === "string" ? body.context.page : undefined;
    const result = await answerNoaQuestion({
      tenantId: session.tenantId,
      role: session.role,
      message: body.message.slice(0, MAX_MESSAGE_LENGTH),
      context: { page },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.error("NOA internal route error", error);
    return NextResponse.json(
      { error: "Ocurrio un error. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
