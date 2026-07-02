import { Prisma, type CashRegisterSession } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CloseSessionInput,
  type OpenSessionInput,
  validateCloseSession,
  validateOpenSession
} from "./cash-register-validation";

export class CashRegisterSessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Sesión de caja ${id} no encontrada.`);
    this.name = "CashRegisterSessionNotFoundError";
  }
}

export class CashRegisterAlreadyOpenError extends Error {
  constructor() {
    super("Ya existe una sesión de caja abierta.");
    this.name = "CashRegisterAlreadyOpenError";
  }
}

export class CashRegisterAlreadyClosedError extends Error {
  constructor() {
    super("La sesión de caja ya está cerrada.");
    this.name = "CashRegisterAlreadyClosedError";
  }
}

export async function openSession(
  input: OpenSessionInput,
  tenantId: string
): Promise<CashRegisterSession> {
  const validated = validateOpenSession(input);

  const existingOpen = await prisma.cashRegisterSession.findFirst({
    where: { status: "OPEN", tenantId }
  });

  if (existingOpen) throw new CashRegisterAlreadyOpenError();

  return prisma.cashRegisterSession.create({
    data: {
      tenantId,
      cashierName: validated.cashierName,
      branchName: validated.branchName,
      ...(validated.shift !== undefined ? { shift: validated.shift } : {}),
      openingAmount: validated.openingAmount,
      ...(validated.openingNotes !== undefined
        ? { openingNotes: validated.openingNotes }
        : {}),
      ...(validated.openingBreakdown !== undefined
        ? { openingBreakdown: validated.openingBreakdown as Prisma.InputJsonValue }
        : {})
    }
  });
}

export async function closeSession(
  id: string,
  input: CloseSessionInput,
  tenantId: string
): Promise<CashRegisterSession> {
  const validated = validateCloseSession(input);

  return prisma.$transaction(async (tx) => {
    const session = await tx.cashRegisterSession.findFirst({
      where: { id, tenantId }
    });

    if (!session) throw new CashRegisterSessionNotFoundError(id);
    if (session.status === "CLOSED") throw new CashRegisterAlreadyClosedError();

    const inResult = await tx.cashMovement.aggregate({
      where: { tenantId, createdAt: { gte: session.openedAt }, type: "IN" },
      _sum: { amount: true }
    });

    const outResult = await tx.cashMovement.aggregate({
      where: { tenantId, createdAt: { gte: session.openedAt }, type: "OUT" },
      _sum: { amount: true }
    });

    const sumIn = inResult._sum.amount ?? new Prisma.Decimal(0);
    const sumOut = outResult._sum.amount ?? new Prisma.Decimal(0);
    const expectedAmount = session.openingAmount.plus(sumIn).minus(sumOut);
    const closingDecimal = new Prisma.Decimal(validated.closingAmount);
    const difference = closingDecimal.minus(expectedAmount);

    return tx.cashRegisterSession.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingAmount: closingDecimal,
        expectedAmount,
        difference,
        ...(validated.closingNotes !== undefined
          ? { closingNotes: validated.closingNotes }
          : {}),
        ...(validated.closingBreakdown !== undefined
          ? { closingBreakdown: validated.closingBreakdown as Prisma.InputJsonValue }
          : {})
      }
    });
  });
}

export async function getCurrentSession(
  tenantId: string
): Promise<CashRegisterSession | null> {
  return prisma.cashRegisterSession.findFirst({
    where: { status: "OPEN", tenantId },
    orderBy: { openedAt: "desc" }
  });
}

export async function getSessionById(
  id: string,
  tenantId: string
): Promise<CashRegisterSession> {
  const session = await prisma.cashRegisterSession.findFirst({
    where: { id, tenantId }
  });

  if (!session) throw new CashRegisterSessionNotFoundError(id);

  return session;
}

export async function listSessions(
  tenantId: string
): Promise<CashRegisterSession[]> {
  return prisma.cashRegisterSession.findMany({
    where: { tenantId },
    orderBy: { openedAt: "desc" }
  });
}

export async function listClosedSessions(
  tenantId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ data: CashRegisterSession[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const where = { tenantId, status: "CLOSED" as const };

  const [data, total] = await prisma.$transaction([
    prisma.cashRegisterSession.findMany({
      where,
      orderBy: { closedAt: "desc" },
      take: limit,
      skip: (page - 1) * limit
    }),
    prisma.cashRegisterSession.count({ where })
  ]);

  return { data, total };
}
