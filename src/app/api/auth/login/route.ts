export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  createSession,
  verifyPassword
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json() as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos." },
      { status: 400 }
    );
  }

  // El email es único por tenant, no global: puede haber más de un usuario
  // con el mismo email en tenants distintos, así que se prueba la contraseña
  // contra cada candidato hasta encontrar el que corresponda.
  const candidates = await prisma.user.findMany({
    where: { email: email.trim().toLowerCase() }
  });

  let user: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    if (await verifyPassword(password, candidate.password)) {
      user = candidate;
      break;
    }
  }

  if (!user) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  if (!user.active) {
    return NextResponse.json(
      { error: "Usuario desactivado. Contactá al propietario de la cuenta." },
      { status: 401 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: user.tenantId }
  });

  const token = await createSession(
    user.id,
    user.tenantId,
    subscription?.status ?? "TRIAL",
    subscription?.trialEndsAt?.toISOString() ?? null,
    user.role
  );
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });

  return NextResponse.json({ ok: true });
}
