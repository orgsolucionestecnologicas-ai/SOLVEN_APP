import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "SALE_CREATED"
  | "CASH_REGISTER_OPENED"
  | "CASH_REGISTER_CLOSED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_PRICE_CHANGE"
  | "INVENTORY_ADJUSTED"
  | "USER_CREATED"
  | "USER_ROLE_CHANGED"
  | "USER_DELETED";

export type LogAuditInput = {
  tenantId: string;
  userId: string;
  userCode?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit(input: LogAuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      userCode: input.userCode ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull
    }
  });
}

export type AuditLogEntry = {
  id: string;
  userId: string;
  userCode: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
  user: { name: string };
};

export async function listAuditLogs(
  tenantId: string,
  options: { page?: number; limit?: number; action?: string } = {}
): Promise<{ data: AuditLogEntry[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const where = {
    tenantId,
    ...(options.action ? { action: options.action } : {})
  };
  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: { user: { select: { name: true } } }
    }),
    prisma.auditLog.count({ where })
  ]);
  return { data: data as AuditLogEntry[], total };
}

export async function listAuditLogsByEntity(
  entityType: string,
  entityId: string,
  tenantId: string
): Promise<AuditLogEntry[]> {
  const data = await prisma.auditLog.findMany({
    where: { tenantId, entityType, entityId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } }
  });
  return data as AuditLogEntry[];
}
