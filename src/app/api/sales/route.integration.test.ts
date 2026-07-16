import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { requireRole, requireTenantId } from "@/lib/tenant";

import { GET, POST } from "./route";

vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(),
  requireRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

const mockedRequireTenantId = vi.mocked(requireTenantId);
const mockedRequireRole = vi.mocked(requireRole);
const testProductNamePrefix = "SOLVEN_INTEGRATION_SALE_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_INTEGRATION_SALE_CUSTOMER_";
const testCashierName = "SOLVEN_INTEGRATION_SALE_CASHIER";
const testTenantEmail = "solven_integration_sale@test.internal";

let testTenantId: string;

describe("sales API database integration", () => {
  beforeEach(async () => {
    await deleteIntegrationSaleData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Sale API Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    const user = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: "Integration Tester",
        email: `solven_integration_sale_user_${Date.now()}@test.internal`,
        password: "test-password",
        role: "OWNER"
      }
    });
    mockedRequireTenantId.mockResolvedValue(testTenantId);
    mockedRequireRole.mockResolvedValue({ tenantId: testTenantId, userId: user.id, role: "OWNER" });
    await prisma.cashRegisterSession.create({
      data: { tenantId: testTenantId, cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteIntegrationSaleData();
    await prisma.$disconnect();
  });

  it("creates a sale through the API flow", async () => {
    const product = await createIntegrationProduct("CREATE", 12.5, 5);

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId: product.id, quantity: 2 }] })
      })
    );
    const responseBody = await response.json();
    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    const inventoryMovement = await prisma.inventoryMovement.findFirstOrThrow({
      where: { reason: `SALE:${responseBody.data.id}`, productId: product.id }
    });
    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "SALE", referenceId: responseBody.data.id }
    });

    expect(response.status).toBe(201);
    expect(responseBody.data).toMatchObject({
      paymentType: "CASH",
      customerId: null,
      debtId: null,
      totalAmount: "25",
      items: [expect.objectContaining({ productId: product.id, quantity: 2, unitPrice: "12.5", total: "25" })]
    });
    expect(updatedProduct.stock).toBe(3);
    expect(inventoryMovement).toMatchObject({ productId: product.id, previousStock: 5, newStock: 3, quantityChange: -2 });
    expect(cashMovement.amount.toString()).toBe("25");
    expect(cashMovement).toMatchObject({ type: "IN", source: "SALE", referenceId: responseBody.data.id });
  });

  it("lists sales after creation", async () => {
    const product = await createIntegrationProduct("LIST", 9, 4);

    const createResponse = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] })
      })
    );
    const createdSale = await createResponse.json();

    const response = await GET(new Request("http://localhost/api/sales"));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdSale.data.id, totalAmount: "9" })])
    );
  });
});

async function createIntegrationProduct(nameSuffix: string, salePrice: number, stock: number) {
  return prisma.product.create({
    data: {
      tenantId: testTenantId,
      name: `${testProductNamePrefix}${nameSuffix}_${Date.now()}`,
      costPrice: 1,
      salePrice,
      stock
    }
  });
}

async function deleteIntegrationSaleData() {
  const testProducts = await prisma.product.findMany({
    where: { name: { startsWith: testProductNamePrefix } },
    select: { id: true }
  });
  const testProductIds = testProducts.map((p) => p.id);
  const testSaleItems = await prisma.saleItem.findMany({
    where: { productId: { in: testProductIds } },
    select: { saleId: true }
  });
  const testSaleIds = [...new Set(testSaleItems.map((si) => si.saleId))];
  const testCustomers = await prisma.customer.findMany({
    where: { name: { startsWith: testCustomerNamePrefix } },
    select: { id: true }
  });
  const testCustomerIds = testCustomers.map((c) => c.id);
  const testDebts = await prisma.debt.findMany({
    where: { customerId: { in: testCustomerIds } },
    select: { id: true }
  });
  const testDebtIds = testDebts.map((d) => d.id);

  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.cashMovement.deleteMany({ where: { source: "SALE", referenceId: { in: testSaleIds } } });
  await prisma.debtPayment.deleteMany({ where: { debtId: { in: testDebtIds } } });
  await prisma.debt.deleteMany({ where: { id: { in: testDebtIds } } });
  await prisma.saleItem.deleteMany({ where: { productId: { in: testProductIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
  await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } });
  await prisma.cashRegisterSession.deleteMany({ where: { cashierName: testCashierName } });
  const tenants = await prisma.tenant.findMany({ where: { email: testTenantEmail }, select: { id: true } });
  const tenantIds = tenants.map((tenant) => tenant.id);
  if (tenantIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
  }
  await prisma.tenant.deleteMany({ where: { email: testTenantEmail } });
}
