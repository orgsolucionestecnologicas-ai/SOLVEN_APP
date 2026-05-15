import type { Service } from "@prisma/client";

import { generateCode } from "@/lib/generate-code";
import { prisma } from "@/lib/prisma";

import {
  type CreateServiceInput,
  type UpdateServiceInput,
  validateCreateServiceInput,
  validateUpdateServiceInput
} from "./service-validation";

export class ServiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Servicio ${id} no encontrado.`);
    this.name = "ServiceNotFoundError";
  }
}

export async function createService(input: CreateServiceInput): Promise<Service> {
  const validated = validateCreateServiceInput(input);
  const code = await generateCode("SRV");

  return prisma.service.create({
    data: {
      ...validated,
      code
    }
  });
}

export async function listServices(): Promise<Service[]> {
  return prisma.service.findMany({
    orderBy: { name: "asc" }
  });
}

export async function getServiceById(id: string): Promise<Service> {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    throw new ServiceNotFoundError(id);
  }
  return service;
}

export async function updateService(
  id: string,
  input: UpdateServiceInput
): Promise<Service> {
  const data = validateUpdateServiceInput(input);
  return prisma.service.update({ where: { id }, data });
}

export async function toggleServiceActive(id: string): Promise<Service> {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    throw new ServiceNotFoundError(id);
  }
  return prisma.service.update({
    where: { id },
    data: { isActive: !existing.isActive }
  });
}
