import { prisma } from "@/lib/prisma";

const CATEGORY_SKU_PREFIXES: Record<string, string> = {
  Alimentos: "ALI",
  Bebidas: "BEB",
  Lácteos: "LAC",
  Limpieza: "LIM",
  "Cuidado Personal": "CPE",
  Hogar: "HOG",
  Panadería: "PAN",
  Snacks: "SNA",
  Otros: "OTR"
};

export function getCategorySkuPrefix(categoryName: string): string {
  return CATEGORY_SKU_PREFIXES[categoryName] ?? "OTR";
}

export async function generateProductSku(tenantId: string, categoryName: string): Promise<string> {
  const prefix = getCategorySkuPrefix(categoryName);

  const counter = await prisma.$transaction(async (tx) => {
    return tx.productSkuCounter.upsert({
      where: { tenantId_categoryPrefix: { tenantId, categoryPrefix: prefix } },
      create: { tenantId, categoryPrefix: prefix, lastVal: 1 },
      update: { lastVal: { increment: 1 } }
    });
  });

  return `${prefix}-${String(counter.lastVal).padStart(4, "0")}`;
}
