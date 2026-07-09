import { Prisma } from "@prisma/client";
import type { Supplier } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { type CreateSupplierInput, SupplierValidationError, validateCreateSupplierInput } from "./supplier-validation";

export async function listSuppliers(tenantId: string): Promise<Supplier[]> {
  return prisma.supplier.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
}

export async function createSupplier(
  input: unknown,
  tenantId: string
): Promise<Supplier> {
  const data: CreateSupplierInput = validateCreateSupplierInput(input);

  try {
    return await prisma.supplier.create({
      data: { ...data, tenantId }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new SupplierValidationError([
        `Ya existe un proveedor con el nombre "${data.name}".`
      ]);
    }
    throw error;
  }
}
