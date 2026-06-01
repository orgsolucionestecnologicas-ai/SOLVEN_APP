import type { InventoryMovement } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type RecordInventoryMovementInput,
  validateRecordInventoryMovementInput
} from "./inventory-movement-validation";

export async function recordInventoryMovement(
  movementInput: RecordInventoryMovementInput,
  tenantId: string
): Promise<InventoryMovement> {
  const validatedMovement = validateRecordInventoryMovementInput(movementInput);

  return prisma.inventoryMovement.create({
    data: { ...validatedMovement, tenantId }
  });
}

export async function listInventoryMovements(tenantId: string) {
  return prisma.inventoryMovement.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } } }
  });
}
