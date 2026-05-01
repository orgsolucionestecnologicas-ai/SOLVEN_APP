import type { InventoryMovement } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type RecordInventoryMovementInput,
  validateRecordInventoryMovementInput
} from "./inventory-movement-validation";

export async function recordInventoryMovement(
  movementInput: RecordInventoryMovementInput
): Promise<InventoryMovement> {
  const validatedMovement = validateRecordInventoryMovementInput(movementInput);

  return prisma.inventoryMovement.create({
    data: validatedMovement
  });
}
