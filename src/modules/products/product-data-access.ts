import type { Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type CreateProductInput,
  validateCreateProductInput
} from "./product-validation";

export async function createProduct(
  productInput: CreateProductInput
): Promise<Product> {
  const validatedProduct = validateCreateProductInput(productInput);

  return prisma.product.create({
    data: validatedProduct
  });
}

export async function listProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    orderBy: {
      name: "asc"
    }
  });
}
