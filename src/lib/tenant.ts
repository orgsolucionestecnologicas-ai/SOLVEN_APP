import { cookies } from "next/headers";
import { type SessionPayload, verifySession } from "./auth";
import { listRolePermissions } from "@/modules/role-permissions";
import { prisma } from "./prisma";

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

const SESSION_REVALIDATE_TTL_MS = 2 * 60 * 1000;
const lastRevalidatedAt = new Map<string, number>();

async function revalidateSessionAgainstDb(session: {
  userId: string;
  tenantId: string;
  role: string;
}): Promise<void> {
  const now = Date.now();
  const lastCheck = lastRevalidatedAt.get(session.userId);
  if (lastCheck && now - lastCheck < SESSION_REVALIDATE_TTL_MS) return;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { active: true, role: true, tenantId: true }
  });

  if (!user || !user.active || user.role !== session.role || user.tenantId !== session.tenantId) {
    lastRevalidatedAt.delete(session.userId);
    throw new UnauthorizedError();
  }

  lastRevalidatedAt.set(session.userId, now);
}

export function __resetSessionRevalidationCacheForTests(): void {
  lastRevalidatedAt.clear();
}

export async function requireRole(
  allowedRoles: string[],
  section?: string
): Promise<{ tenantId: string; userId: string; role: string }> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  await revalidateSessionAgainstDb(session);
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
