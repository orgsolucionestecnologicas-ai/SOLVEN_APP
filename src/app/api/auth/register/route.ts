export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  createSession,
  hashPassword
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    businessName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };

  const { businessName, email, password, confirmPassword } = body;

  if (!businessName?.trim()) {
    return NextResponse.json(
      { error: "El nombre del negocio es requerido." },
      { status: 400 }
    );
  }

  if (!email?.trim()) {
    return NextResponse.json(
      { error: "El email es requerido." },
      { status: 400 }
    );
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Las contraseñas no coinciden." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email." },
      { status: 409 }
    );
  }

  const hashedPassword = await hashPassword(password);

  const tenant = await prisma.tenant.create({
    data: { businessName: businessName.trim(), email: normalizedEmail }
  });

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: businessName.trim(),
      tenantId: tenant.id
    }
  });

  const token = await createSession(user.id, tenant.id);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
