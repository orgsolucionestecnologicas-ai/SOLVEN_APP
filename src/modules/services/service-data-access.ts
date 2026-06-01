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

export async function createService(
  input: CreateServiceInput,
  tenantId: string
): Promise<Service> {
  const validated = validateCreateServiceInput(input);
  const code = await generateCode("SRV");

  return prisma.service.create({
    data: { ...validated, code, tenantId }
  });
}

export async function listServices(tenantId: string): Promise<Service[]> {
  return prisma.service.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
}

export async function getServiceById(
  id: string,
  tenantId: string
): Promise<Service> {
  const service = await prisma.service.findFirst({ where: { id, tenantId } });
  if (!service) throw new ServiceNotFoundError(id);
  return service;
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
  tenantId: string
): Promise<Service> {
  const data = validateUpdateServiceInput(input);
  return prisma.service.update({ where: { id, tenantId }, data });
}

export async function toggleServiceActive(
  id: string,
  tenantId: string
): Promise<Service> {
  const existing = await prisma.service.findFirst({ where: { id, tenantId } });
  if (!existing) throw new ServiceNotFoundError(id);
  return prisma.service.update({
    where: { id },
    data: { isActive: !existing.isActive }
  });
}
