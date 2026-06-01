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

export async function listCustomers(tenantId: string): Promise<Customer[]> {
  return prisma.customer.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  tenantId: string
): Promise<Customer> {
  const data = validateUpdateCustomerInput(input);
  return prisma.customer.update({ where: { id, tenantId }, data });
}
