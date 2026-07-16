import { cookies } from "next/headers";
import { type SessionPayload, verifySession } from "./auth";
import { listRolePermissions } from "@/modules/role-permissions";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

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
  if (!tenantId) throw new UnauthorizedError();
  return tenantId;
}

export async function requireRole(
  allowedRoles: string[],
  section?: string
): Promise<{ tenantId: string; userId: string; role: string }> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (!allowedRoles.includes(session.role)) throw new ForbiddenError();

  if (section && session.role !== "OWNER") {
    const permissions = await listRolePermissions(session.tenantId);
    const permission = permissions.find(
      (p) => p.role === session.role && p.section === section
    );
    if (permission && !permission.canAccess) throw new ForbiddenError();
  }

  return { tenantId: session.tenantId, userId: session.userId, role: session.role };
}
