import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { generateProductSku, getCategorySkuPrefix } from "./product-sku";

const testTenantEmailA = "solven_product_sku_a@test.internal";
const testTenantEmailB = "solven_product_sku_b@test.internal";

let tenantAId: string;
let tenantBId: string;

describe("getCategorySkuPrefix", () => {
  it("maps known categories to their 3-letter prefix", () => {
    expect(getCategorySkuPrefix("Bebidas")).toBe("BEB");
    expect(getCategorySkuPrefix("Alimentos")).toBe("ALI");
    expect(getCategorySkuPrefix("Lácteos")).toBe("LAC");
  });

  it("falls back to OTR for an unmapped category", () => {
    expect(getCategorySkuPrefix("Categoría Inventada Que No Existe")).toBe("OTR");
  });
});

describe("generateProductSku", () => {
  beforeEach(async () => {
    await deleteSkuTestData();
    const tenantA = await prisma.tenant.create({
      data: { businessName: "Product SKU Test Tenant A", email: testTenantEmailA }
    });
    tenantAId = tenantA.id;
    const tenantB = await prisma.tenant.create({
      data: { businessName: "Product SKU Test Tenant B", email: testTenantEmailB }
    });
    tenantBId = tenantB.id;
  });

  afterAll(async () => {
    await deleteSkuTestData();
    await prisma.$disconnect();
  });

  it("generates a sequential, zero-padded code prefixed by category, starting at 0001", async () => {
    const first = await generateProductSku(tenantAId, "Bebidas");
    const second = await generateProductSku(tenantAId, "Bebidas");

    expect(first).toBe("BEB-0001");
    expect(second).toBe("BEB-0002");
  });

  it("keeps independent counters per category within the same tenant", async () => {
    const bebida = await generateProductSku(tenantAId, "Bebidas");
    const alimento = await generateProductSku(tenantAId, "Alimentos");
    const bebida2 = await generateProductSku(tenantAId, "Bebidas");

    expect(bebida).toBe("BEB-0001");
    expect(alimento).toBe("ALI-0001");
    expect(bebida2).toBe("BEB-0002");
  });

  it("keeps independent counters per tenant for the same category", async () => {
    const tenantAFirst = await generateProductSku(tenantAId, "Bebidas");
    const tenantBFirst = await generateProductSku(tenantBId, "Bebidas");
    const tenantASecond = await generateProductSku(tenantAId, "Bebidas");

    expect(tenantAFirst).toBe("BEB-0001");
    expect(tenantBFirst).toBe("BEB-0001");
    expect(tenantASecond).toBe("BEB-0002");
  });

  it("falls back to the OTR prefix for a category with no mapping", async () => {
    const code = await generateProductSku(tenantAId, "Categoría Inventada Que No Existe");
    expect(code).toBe("OTR-0001");
  });

  it("does not collide when generating concurrently for the same tenant and category", async () => {
    const codes = await Promise.all(
      Array.from({ length: 5 }, () => generateProductSku(tenantAId, "Snacks"))
    );
    const unique = new Set(codes);
    expect(unique.size).toBe(5);
    expect([...unique].sort()).toEqual([
      "SNA-0001",
      "SNA-0002",
      "SNA-0003",
      "SNA-0004",
      "SNA-0005"
    ]);
  });
});

async function deleteSkuTestData() {
  const tenants = await prisma.tenant.findMany({
    where: { email: { in: [testTenantEmailA, testTenantEmailB] } },
    select: { id: true }
  });
  const tenantIds = tenants.map((t) => t.id);
  if (tenantIds.length === 0) return;
  await prisma.productSkuCounter.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
}
