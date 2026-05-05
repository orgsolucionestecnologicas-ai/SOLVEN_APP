import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

  if (currentPassword !== process.env.SOLVEN_PASSWORD) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
