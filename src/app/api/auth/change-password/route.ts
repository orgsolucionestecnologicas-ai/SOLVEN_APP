export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Todos los campos son requeridos." },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId }
  });

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!(await verifyPassword(currentPassword, user.password))) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta." },
      { status: 401 }
    );
  }

  const hashedNewPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id, tenantId: session.tenantId },
    data: { password: hashedNewPassword }
  });

  return NextResponse.json({ ok: true });
}
