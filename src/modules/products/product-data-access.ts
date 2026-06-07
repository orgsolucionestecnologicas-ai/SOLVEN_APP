import type { Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/generate-code";

import {
  type CreateProductInput,
  type UpdateProductInput,
  validateCreateProductInput,
  validateUpdateProductInput
} from "./product-validation";

export async function createProduct(
  productInput: CreateProductInput,
  tenantId: string
): Promise<Product> {
  const validatedProduct = validateCreateProductInput(productInput);
  const productCode = await generateCode("PROD");

  return prisma.product.create({
    data: { ...validatedProduct, productCode, tenantId }
  });
}

export type PaginationParams = { page?: number; limit?: number };

export async function listProducts(
  tenantId: string,
  { page = 1, limit = 20 }: PaginationParams = {}
): Promise<{ data: Product[]; total: number }> {
  const where = { tenantId };
  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: (page - 1) * limit }),
    prisma.product.count({ where }),
  ]);
  return { data, total };
}

export async function getProductById(
  id: string,
  tenantId: string
): Promise<Product | null> {
  return prisma.product.findFirst({ where: { id, tenantId } });
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  tenantId: string
): Promise<Product> {
  const data = validateUpdateProductInput(input);

  return prisma.product.update({
    where: { id, tenantId },
    data
  });
}
