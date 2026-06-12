import { prisma } from "@/lib/prisma";

export type ARCACredentials = {
  token: string;
  sign: string;
};

export async function getCachedToken(tenantId: string): Promise<ARCACredentials | null> {
  const cache = await prisma.aRCATokenCache.findUnique({ where: { tenantId } });
  if (!cache) return null;
  if (cache.expiresAt <= new Date()) return null;
  return { token: cache.token, sign: cache.sign };
}

export async function saveTokenCache(
  tenantId: string,
  credentials: ARCACredentials,
  expiresAt: Date
): Promise<void> {
  await prisma.aRCATokenCache.upsert({
    where: { tenantId },
    create: { tenantId, token: credentials.token, sign: credentials.sign, expiresAt },
    update: { token: credentials.token, sign: credentials.sign, expiresAt },
  });
}
