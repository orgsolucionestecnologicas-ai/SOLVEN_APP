import { Prisma } from "@prisma/client";
import type { Category, Subcategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  CategoryValidationError,
  validateCategoryName,
  validateSubcategoryName
} from "./category-validation";

export type CategoryWithDetails = Category & {
  subcategories: Subcategory[];
  _count: { products: number };
};

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Categoría no encontrada.");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryHasProductsError extends Error {
  constructor() {
    super("La categoría tiene productos asociados y no puede ser eliminada.");
    this.name = "CategoryHasProductsError";
  }
}

export class CategoryHasSubcategoriesError extends Error {
  constructor() {
    super("La categoría tiene subcategorías y no puede ser eliminada.");
    this.name = "CategoryHasSubcategoriesError";
  }
}

export class SubcategoryNotFoundError extends Error {
  constructor() {
    super("Subcategoría no encontrada.");
    this.name = "SubcategoryNotFoundError";
  }
}

export class SubcategoryHasProductsError extends Error {
  constructor() {
    super("La subcategoría tiene productos asociados y no puede ser eliminada.");
    this.name = "SubcategoryHasProductsError";
  }
}

export async function listCategories(
  tenantId: string
): Promise<CategoryWithDetails[]> {
  return prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      subcategories: { orderBy: { name: "asc" } },
      _count: { select: { products: true } }
    }
  });
}

export async function createCategory(
  name: string,
  tenantId: string
): Promise<Category> {
  const validatedName = validateCategoryName(name);

  try {
    return await prisma.category.create({
      data: { name: validatedName, tenantId }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new CategoryValidationError([
        `Ya existe una categoría con el nombre "${validatedName}".`
      ]);
    }
    throw error;
  }
}

export async function deleteCategory(
  id: string,
  tenantId: string
): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { products: true, subcategories: true } } }
  });

  if (!category) throw new CategoryNotFoundError();
  if (category._count.products > 0) throw new CategoryHasProductsError();
  if (category._count.subcategories > 0) throw new CategoryHasSubcategoriesError();

  await prisma.category.delete({ where: { id } });
}

export async function createSubcategory(
  name: string,
  categoryId: string,
  tenantId: string
): Promise<Subcategory> {
  const validatedName = validateSubcategoryName(name);

  const categoryExists = await prisma.category.findFirst({
    where: { id: categoryId, tenantId }
  });

  if (!categoryExists) throw new CategoryNotFoundError();

  try {
    return await prisma.subcategory.create({
      data: { name: validatedName, categoryId }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new CategoryValidationError([
        `Ya existe una subcategoría con el nombre "${validatedName}" en esta categoría.`
      ]);
    }
    throw error;
  }
}

export async function deleteSubcategory(
  id: string,
  tenantId: string
): Promise<void> {
  const subcategory = await prisma.subcategory.findFirst({
    where: { id, category: { tenantId } },
    include: { _count: { select: { products: true } } }
  });

  if (!subcategory) throw new SubcategoryNotFoundError();
  if (subcategory._count.products > 0) throw new SubcategoryHasProductsError();

  await prisma.subcategory.delete({ where: { id } });
}
