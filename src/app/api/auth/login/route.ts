export const dynamic = 'force-dynamic';
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_MAX_AGE, COOKIE_NAME, createSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body as { username: string; password: string };

  const validUsername = process.env.SOLVEN_USER;
  const validPassword = process.env.SOLVEN_PASSWORD;

  if (
    !username ||
    !password ||
    username !== validUsername ||
    password !== validPassword
  ) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const token = await createSessionToken(username);
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
