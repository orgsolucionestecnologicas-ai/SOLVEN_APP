import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant";

import { GET, POST } from "./route";

vi.mock("@/lib/tenant", () => ({ requireTenantId: vi.fn() }));

const mockedRequireTenantId = vi.mocked(requireTenantId);
const testProductNamePrefix = "SOLVEN_INTEGRATION_PRODUCT_";
const testTenantEmail = "solven_integration_product@test.internal";

let testTenantId: string;

describe("products API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationProducts();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Product API Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    mockedRequireTenantId.mockResolvedValue(testTenantId);
  });

  afterAll(async () => {
    await deleteIntegrationProducts();
    await prisma.$disconnect();
  });

  it("creates a product through the API flow", async () => {
    const productName = `${testProductNamePrefix}${Date.now()}`;

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({ name: productName, costPrice: 12.5, salePrice: 18.75, stock: 7 })
      })
    );

    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({ name: productName, costPrice: "12.5", salePrice: "18.75", stock: 7 });
  });

  it("lists products after creation", async () => {
    const productName = `${testProductNamePrefix}${Date.now()}`;

    await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({ name: productName, costPrice: 4, salePrice: 6, stock: 3 })
      })
    );

    const response = await GET(new Request("http://localhost/api/products"));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: productName, costPrice: "4", salePrice: "6", stock: 3 })
      ])
    );
  });
});

async function deleteIntegrationProducts() {
  await prisma.product.deleteMany({ where: { name: { startsWith: testProductNamePrefix } } });
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
