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
  | "USER_ACTIVATED"
  | "USER_DEACTIVATED"
  | "USER_PIN_CHANGED"
  | "USER_DELETED"
  | "ROLE_PERMISSIONS_UPDATED"
  | "RETURN_CREATED"
  | "DEBT_CREATED"
  | "DEBT_PAYMENT_REGISTERED"
  | "DEBT_WRITTEN_OFF"
  | "QUOTE_CREATED"
  | "QUOTE_CONFIRMED"
  | "QUOTE_CANCELLED"
  | "INVOICE_EMITTED"
  | "PROMOTION_CREATED"
  | "PROMOTION_UPDATED"
  | "PROMOTION_DELETED"
  | "PROMOTION_DUPLICATED";

export type LogAuditInput = {
  tenantId: string;
  userId: string;
  userCode?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

// La auditoria es fire-and-forget: casi todos los call sites la invocan con
// `void logAudit(...)` despues de que la operacion de negocio ya commiteo. Si
// el INSERT falla y el rechazo escapa, queda una unhandled promise rejection
// (Node puede terminar el proceso) y, si el call site la esperara, una
// operacion de negocio ya persistida terminaria devolviendo 500. Por eso el
// error se contiene aca, en un solo lugar, en vez de en cada call site.
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
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
  } catch (error) {
    console.error("[audit] no se pudo registrar la accion", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      error
    });
  }
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
  options: { page?: number; limit?: number; action?: string; userId?: string } = {}
): Promise<{ data: AuditLogEntry[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const where = {
    tenantId,
    ...(options.action ? { action: options.action } : {}),
    ...(options.userId ? { userId: options.userId } : {})
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
