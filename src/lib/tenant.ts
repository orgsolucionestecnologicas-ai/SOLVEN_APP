import { cookies } from "next/headers";
import { verifySession } from "./auth";

export async function getTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("solven_session")?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session?.tenantId ?? null;
}

export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}
