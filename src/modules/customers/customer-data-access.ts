import type { Customer } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateCustomerInput,
  type UpdateCustomerInput,
  validateCreateCustomerInput,
  validateUpdateCustomerInput
} from "./customer-validation";

export async function createCustomer(
  customerInput: CreateCustomerInput
): Promise<Customer> {
  const validatedCustomer = validateCreateCustomerInput(customerInput);

  return prisma.customer.create({
    data: validatedCustomer
  });
}

export async function listCustomers(): Promise<Customer[]> {
  return prisma.customer.findMany({
    orderBy: {
      name: "asc"
    }
  });
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
): Promise<Customer> {
  const data = validateUpdateCustomerInput(input);
  return prisma.customer.update({ where: { id }, data });
}
