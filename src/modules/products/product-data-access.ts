import type { Prisma, Product } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/modules/audit";

import { generateProductSku } from "./product-sku";
import {
  type CreateProductInput,
  ProductValidationError,
  type UpdateProductInput,
  validateCreateProductInput,
  validateUpdateProductInput
} from "./product-validation";

async function resolveSubcategoryId(
  client: Prisma.TransactionClient,
  tenantId: string,
  categoryName: string,
  subcategoryName: string | undefined
): Promise<string | null> {
  if (!subcategoryName) {
    return null;
  }

  const subcategory = await client.subcategory.findFirst({
    where: { name: subcategoryName, category: { tenantId, name: categoryName } }
  });

  return subcategory?.id ?? null;
}

export async function createProduct(
  productInput: CreateProductInput,
  tenantId: string
): Promise<Product> {
  const validatedProduct = validateCreateProductInput(productInput);
  const { subcategoryName, ...productData } = validatedProduct;
  const productCode = await generateProductSku(tenantId, validatedProduct.categoryName);

  return prisma.$transaction(async (transaction) => {
    const subcategoryId = await resolveSubcategoryId(
      transaction,
      tenantId,
      validatedProduct.categoryName,
      subcategoryName
    );

    const product = await transaction.product.create({
      data: { ...productData, productCode, subcategoryId, tenantId }
    });

    if (validatedProduct.stock > 0) {
      await transaction.inventoryMovement.create({
        data: {
          tenantId,
          productId: product.id,
          reason: "Stock inicial de alta de producto",
          previousStock: 0,
          newStock: validatedProduct.stock,
          quantityChange: validatedProduct.stock
        }
      });
    }

    return product;
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
  const { subcategoryName, ...updateData } = validateUpdateProductInput(input);

  const existing = await prisma.product.findFirstOrThrow({ where: { id, tenantId } });

  const subcategoryId =
    subcategoryName !== undefined
      ? await resolveSubcategoryId(
          prisma,
          tenantId,
          updateData.categoryName ?? existing.categoryName,
          subcategoryName
        )
      : undefined;

  const product = await prisma.product.update({
    where: { id, tenantId },
    data: { ...updateData, ...(subcategoryId !== undefined ? { subcategoryId } : {}) }
  });

  const costPriceBefore = existing.costPrice ? existing.costPrice.toNumber() : null;
  const salePriceBefore = existing.salePrice.toNumber();
  const costPriceAfter = product.costPrice ? product.costPrice.toNumber() : null;
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
          const { subcategoryName: _subcategoryName, ...data } = validateUpdateProductInput(
            updateInput as UpdateProductInput
          );
          await tx.product.update({ where: { id: existing.id, tenantId }, data });
          updated++;
        } else {
          const { subcategoryName: _subcategoryName, ...data } = validateCreateProductInput(row);
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
