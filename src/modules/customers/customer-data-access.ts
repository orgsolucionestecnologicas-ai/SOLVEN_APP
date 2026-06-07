import type { Customer } from "@prisma/client";

import { generateCode } from "@/lib/generate-code";
import { prisma } from "@/lib/prisma";

import {
  type CreateCustomerInput,
  type UpdateCustomerInput,
  validateCreateCustomerInput,
  validateUpdateCustomerInput
} from "./customer-validation";

export async function createCustomer(
  customerInput: CreateCustomerInput,
  tenantId: string
): Promise<Customer> {
  const validatedCustomer = validateCreateCustomerInput(customerInput);
  const customerCode = await generateCode("CLI");

  return prisma.customer.create({
    data: { ...validatedCustomer, customerCode, tenantId }
  });
}

export type PaginationParams = { page?: number; limit?: number };

export async function listCustomers(
  tenantId: string,
  { page = 1, limit = 20 }: PaginationParams = {}
): Promise<{ data: Customer[]; total: number }> {
  const where = { tenantId };
  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: (page - 1) * limit }),
    prisma.customer.count({ where }),
  ]);
  return { data, total };
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  tenantId: string
): Promise<Customer> {
  const data = validateUpdateCustomerInput(input);
  return prisma.customer.update({ where: { id, tenantId }, data });
}
