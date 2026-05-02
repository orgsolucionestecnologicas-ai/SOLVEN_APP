import type { CashMovement } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateCashMovementInput,
  validateCreateCashMovementInput
} from "./cash-movement-validation";

export async function createCashMovement(
  movementInput: CreateCashMovementInput
): Promise<CashMovement> {
  const validatedMovement = validateCreateCashMovementInput(movementInput);

  return prisma.cashMovement.create({
    data: validatedMovement
  });
}

export async function listCashMovements(): Promise<CashMovement[]> {
  return prisma.cashMovement.findMany({
    orderBy: {
      movementDate: "desc"
    }
  });
}
