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

export async function listProducts(tenantId: string): Promise<Product[]> {
  return prisma.product.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
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
