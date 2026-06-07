import { cookies } from "next/headers";
import { type SessionPayload, verifySession } from "./auth";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("solven_session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getTenantId(): Promise<string | null> {
  const session = await getSession();
  return session?.tenantId ?? null;
}

export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

export async function requireRole(
  allowedRoles: string[]
): Promise<{ tenantId: string; userId: string; role: string }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (!allowedRoles.includes(session.role)) throw new Error("Forbidden");
  return { tenantId: session.tenantId, userId: session.userId, role: session.role };
}
