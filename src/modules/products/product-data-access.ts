import type { Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/generate-code";
import { logAudit } from "@/modules/audit";

import {
  type CreateProductInput,
  ProductValidationError,
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

export type PaginationParams = { page?: number; limit?: number; active?: boolean };

export async function listProducts(
  tenantId: string,
  { page = 1, limit = 20, active }: PaginationParams = {}
): Promise<{ data: Product[]; total: number }> {
  const where = { tenantId, ...(active !== undefined ? { active } : {}) };
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
  tenantId: string,
  userId: string
): Promise<Product> {
  const data = validateUpdateProductInput(input);

  const existing = await prisma.product.findFirstOrThrow({ where: { id, tenantId } });

  const product = await prisma.product.update({
    where: { id, tenantId },
    data
  });

  const costPriceBefore = existing.costPrice.toNumber();
  const salePriceBefore = existing.salePrice.toNumber();
  const costPriceAfter = product.costPrice.toNumber();
  const salePriceAfter = product.salePrice.toNumber();

  if (costPriceBefore !== costPriceAfter || salePriceBefore !== salePriceAfter) {
    void logAudit({
      tenantId,
      userId,
      action: "PRODUCT_PRICE_CHANGE",
      entityType: "Product",
      entityId: product.id,
      metadata: { costPriceBefore, costPriceAfter, salePriceBefore, salePriceAfter }
    });
  }

  return product;
}

export type ImportProductRow = CreateProductInput & { productCode?: string };

export type ImportProductsResult = {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
};

export async function importProducts(
  rows: ImportProductRow[],
  tenantId: string
): Promise<ImportProductsResult> {
  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const productCode =
        typeof row.productCode === "string" && row.productCode.trim().length > 0
          ? row.productCode.trim()
          : undefined;

      try {
        const existing = productCode
          ? await tx.product.findFirst({ where: { tenantId, productCode } })
          : null;

        if (existing) {
          const { productCode: _ignored, ...updateInput } = row;
          const data = validateUpdateProductInput(updateInput as UpdateProductInput);
          await tx.product.update({ where: { id: existing.id, tenantId }, data });
          updated++;
        } else {
          const data = validateCreateProductInput(row);
          await tx.product.create({
            data: { ...data, productCode: productCode ?? null, tenantId }
          });
          created++;
        }
      } catch (error) {
        const message =
          error instanceof ProductValidationError
            ? error.reasons.join(" ")
            : "Error desconocido al procesar la fila.";
        errors.push({ row: rowNumber, message });
      }
    }
  });

  return { created, updated, errors };
}
