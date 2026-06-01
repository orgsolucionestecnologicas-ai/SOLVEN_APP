import type { CashMovement } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateCashMovementInput,
  validateCreateCashMovementInput
} from "./cash-movement-validation";

export async function createCashMovement(
  movementInput: CreateCashMovementInput,
  tenantId: string
): Promise<CashMovement> {
  const validatedMovement = validateCreateCashMovementInput(movementInput);

  return prisma.cashMovement.create({
    data: { ...validatedMovement, tenantId }
  });
}

export async function listCashMovements(tenantId: string): Promise<CashMovement[]> {
  return prisma.cashMovement.findMany({
    where: { tenantId },
    orderBy: { movementDate: "desc" }
  });
}
