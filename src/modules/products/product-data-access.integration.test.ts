import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createProduct } from "./product-data-access";

const testProductNamePrefix = "SOLVEN_PRODUCT_DATA_ACCESS_";
const testTenantEmail = "solven_product_data_access@test.internal";
const otherTestTenantEmail = "solven_product_data_access_other@test.internal";

let testTenantId: string;
let otherTestTenantId: string;

describe("createProduct", () => {
  beforeEach(async () => {
    await deleteProductDataAccessTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Product Data Access Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;

    const otherTenant = await prisma.tenant.create({
      data: { businessName: "Product Data Access Other Test Tenant", email: otherTestTenantEmail }
    });
    otherTestTenantId = otherTenant.id;
  });

  afterAll(async () => {
    await deleteProductDataAccessTestData();
    await prisma.$disconnect();
  });

  it("records an inventory movement for the initial stock when creating a product with stock > 0", async () => {
    const product = await createProduct(
      { name: `${testProductNamePrefix}${Date.now()}`, costPrice: 5, salePrice: 8, stock: 12 },
      testTenantId
    );

    const inventoryMovements = await prisma.inventoryMovement.findMany({ where: { productId: product.id } });

    expect(inventoryMovements).toHaveLength(1);
    expect(inventoryMovements[0]).toMatchObject({
      tenantId: testTenantId,
      productId: product.id,
      reason: "Stock inicial de alta de producto",
      previousStock: 0,
      newStock: 12,
      quantityChange: 12
    });
  });

  it("does not record an inventory movement when creating a product with zero stock", async () => {
    const product = await createProduct(
      { name: `${testProductNamePrefix}${Date.now()}`, costPrice: 5, salePrice: 8, stock: 0 },
      testTenantId
    );

    const inventoryMovements = await prisma.inventoryMovement.findMany({ where: { productId: product.id } });

    expect(inventoryMovements).toHaveLength(0);
  });

  it("allows two different tenants to use the same productCode", async () => {
    const productCode = `SOLVEN_TEST_CODE_${Date.now()}`;

    await prisma.product.create({
      data: {
        tenantId: testTenantId,
        name: `${testProductNamePrefix}A_${Date.now()}`,
        costPrice: 5,
        salePrice: 8,
        stock: 1,
        productCode
      }
    });

    await expect(
      prisma.product.create({
        data: {
          tenantId: otherTestTenantId,
          name: `${testProductNamePrefix}B_${Date.now()}`,
          costPrice: 5,
          salePrice: 8,
          stock: 1,
          productCode
        }
      })
    ).resolves.toBeTruthy();
  });

  it("rejects a duplicate productCode within the same tenant", async () => {
    const productCode = `SOLVEN_TEST_CODE_${Date.now()}`;

    await prisma.product.create({
      data: {
        tenantId: testTenantId,
        name: `${testProductNamePrefix}A_${Date.now()}`,
        costPrice: 5,
        salePrice: 8,
        stock: 1,
        productCode
      }
    });

    await expect(
      prisma.product.create({
        data: {
          tenantId: testTenantId,
          name: `${testProductNamePrefix}B_${Date.now()}`,
          costPrice: 5,
          salePrice: 8,
          stock: 1,
          productCode
        }
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });
});

async function deleteProductDataAccessTestData() {
  const testTenants = await prisma.tenant.findMany({
    where: { email: { in: [testTenantEmail, otherTestTenantEmail] } },
    select: { id: true }
  });
  const testTenantIds = testTenants.map((t) => t.id);

  const testProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { startsWith: testProductNamePrefix } },
        { tenantId: { in: testTenantIds } }
      ]
    },
    select: { id: true }
  });
  const testProductIds = testProducts.map((p) => p.id);

  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });
}
