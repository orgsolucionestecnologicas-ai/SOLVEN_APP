import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createProduct } from "../products";
import { createSale, SaleNoCashRegisterOpenError } from "../sales";
import { processReturn, ReturnConcurrentConflictError, ReturnValidationError } from "./index";

const testProductNamePrefix = "SOLVEN_RETURN_TEST_PRODUCT_";
const testCustomerNamePrefix = "SOLVEN_RETURN_TEST_CUSTOMER_";
const testCashierName = "SOLVEN_RETURN_TEST_CASHIER";
const testTenantEmail = "solven_return_test@test.internal";

let testTenantId: string;

describe("processReturn — refundMethod", () => {
  beforeEach(async () => {
    await deleteReturnTestData();
    const tenant = await prisma.tenant.create({
      data: { businessName: "Return Test Tenant", email: testTenantEmail }
    });
    testTenantId = tenant.id;
    await prisma.cashRegisterSession.create({
      data: { tenantId: testTenantId, cashierName: testCashierName, openingAmount: 0, status: "OPEN" }
    });
  });

  afterAll(async () => {
    await deleteReturnTestData();
    await prisma.$disconnect();
  });

  it("creates a CashMovement OUT when refundMethod is Efectivo", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      { paymentType: "CASH", items: [{ productId: product.id, quantity: 2 }] },
      testTenantId
    );

    const result = await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 1 }],
      testTenantId,
      "OTRO",
      undefined,
      [{ method: "Efectivo", amount: 25 }]
    );

    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "RETURN", referenceId: sale.id }
    });
    expect(cashMovement).toMatchObject({ type: "OUT", source: "RETURN", referenceId: sale.id });
    expect(Number(cashMovement.amount)).toBe(Number(result.totalReturned));

    const returnRecord = await prisma.return.findUniqueOrThrow({ where: { id: result.returnId } });
    expect(returnRecord.refundDetails).toEqual([{ method: "Efectivo", amount: 25 }]);
  });

  it("does not create a CashMovement when refundMethod is not Efectivo", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      {
        paymentType: "CASH",
        items: [{ productId: product.id, quantity: 2 }],
        paymentDetails: [{ method: "Tarjeta", amount: 50 }]
      },
      testTenantId
    );

    const result = await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 1 }],
      testTenantId,
      "OTRO",
      undefined,
      [{ method: "Tarjeta", amount: 25, reference: "000123456" }]
    );

    const cashMovements = await prisma.cashMovement.findMany({
      where: { source: "RETURN", referenceId: sale.id }
    });
    expect(cashMovements).toHaveLength(0);

    const returnRecord = await prisma.return.findUniqueOrThrow({ where: { id: result.returnId } });
    expect(returnRecord.refundDetails).toEqual([
      { method: "Tarjeta", amount: 25, reference: "000123456" }
    ]);
  });

  it("rejects a refund method other than Tarjeta when the sale was paid with a card", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      {
        paymentType: "CASH",
        items: [{ productId: product.id, quantity: 2 }],
        paymentDetails: [{ method: "Tarjeta", amount: 50 }]
      },
      testTenantId
    );

    await expect(
      processReturn(
        sale.id,
        [{ productId: product.id, quantity: 1 }],
        testTenantId,
        "OTRO",
        undefined,
        [{ method: "Efectivo", amount: 25 }]
      )
    ).rejects.toThrow(ReturnValidationError);

    const returnRecords = await prisma.return.findMany({ where: { saleId: sale.id } });
    expect(returnRecords).toHaveLength(0);
  });

  it("accepts a Tarjeta refund with refundReference when the sale was paid with a card", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      {
        paymentType: "CASH",
        items: [{ productId: product.id, quantity: 2 }],
        paymentDetails: [{ method: "Tarjeta", amount: 50 }]
      },
      testTenantId
    );

    const result = await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 1 }],
      testTenantId,
      "OTRO",
      undefined,
      [{ method: "Tarjeta", amount: 25, reference: "000123456" }]
    );

    const returnRecord = await prisma.return.findUniqueOrThrow({ where: { id: result.returnId } });
    expect(returnRecord.refundDetails).toEqual([
      { method: "Tarjeta", amount: 25, reference: "000123456" }
    ]);
  });

  it("rejects a non-credit return that does not specify a refundMethod", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      { paymentType: "CASH", items: [{ productId: product.id, quantity: 1 }] },
      testTenantId
    );

    await expect(
      processReturn(sale.id, [{ productId: product.id, quantity: 1 }], testTenantId, "OTRO")
    ).rejects.toThrow(ReturnValidationError);

    const cashMovements = await prisma.cashMovement.findMany({
      where: { source: "RETURN", referenceId: sale.id }
    });
    expect(cashMovements).toHaveLength(0);
  });

  it("reduces the linked debt without requiring a refundMethod on credit sales", async () => {
    const product = await createTestProduct();
    const customer = await prisma.customer.create({
      data: { tenantId: testTenantId, name: `${testCustomerNamePrefix}${Date.now()}` }
    });
    const debt = await prisma.debt.create({
      data: { tenantId: testTenantId, customerId: customer.id, totalAmount: 50, remainingAmount: 50 }
    });
    const sale = await prisma.sale.create({
      data: {
        tenantId: testTenantId,
        paymentType: "CREDIT",
        totalAmount: 50,
        debtId: debt.id,
        customerId: customer.id,
        items: {
          create: [{ productId: product.id, quantity: 2, unitPrice: 25, total: 50 }]
        }
      }
    });

    const result = await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 1 }],
      testTenantId,
      "OTRO"
    );

    const updatedDebt = await prisma.debt.findUniqueOrThrow({ where: { id: debt.id } });
    expect(updatedDebt.remainingAmount.toString()).toBe("25");

    const cashMovements = await prisma.cashMovement.findMany({
      where: { source: "RETURN", referenceId: sale.id }
    });
    expect(cashMovements).toHaveLength(0);

    const returnRecord = await prisma.return.findUniqueOrThrow({ where: { id: result.returnId } });
    expect(returnRecord.refundMethod).toBeNull();
  });

  it("prorates the refund by the sale's discount", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      {
        paymentType: "CASH",
        items: [{ productId: product.id, quantity: 2 }],
        globalDiscountType: "percent",
        globalDiscountValue: 20
      },
      testTenantId
    );

    const result = await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 1 }],
      testTenantId,
      "OTRO",
      undefined,
      [{ method: "Efectivo", amount: 20 }]
    );

    expect(result.totalReturned).toBe("20.00");
  });

  it("reduces the linked debt when returning a MIXED-payment sale", async () => {
    const product = await createTestProduct();
    const customer = await prisma.customer.create({
      data: { tenantId: testTenantId, name: `${testCustomerNamePrefix}${Date.now()}` }
    });
    const sale = await createSale(
      {
        paymentType: "MIXED",
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 4 }],
        paymentDetails: [{ method: "Efectivo", amount: 60 }]
      },
      testTenantId
    );

    const debtBefore = await prisma.debt.findFirstOrThrow({ where: { customerId: customer.id } });
    expect(debtBefore.remainingAmount.toString()).toBe("40");

    await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 1 }],
      testTenantId,
      "OTRO",
      undefined,
      [{ method: "Efectivo", amount: 25 }]
    );

    const debtAfter = await prisma.debt.findUniqueOrThrow({ where: { id: debtBefore.id } });
    expect(debtAfter.remainingAmount.toString()).toBe("15");
  });

  it("rejects a cash refund when no cash register session is open", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      { paymentType: "CASH", items: [{ productId: product.id, quantity: 1 }] },
      testTenantId
    );

    await prisma.cashRegisterSession.updateMany({
      where: { tenantId: testTenantId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() }
    });

    await expect(
      processReturn(
        sale.id,
        [{ productId: product.id, quantity: 1 }],
        testTenantId,
        "OTRO",
        undefined,
        [{ method: "Efectivo", amount: 25 }]
      )
    ).rejects.toThrow(SaleNoCashRegisterOpenError);

    const cashMovements = await prisma.cashMovement.findMany({
      where: { source: "RETURN", referenceId: sale.id }
    });
    expect(cashMovements).toHaveLength(0);

    const returnRecords = await prisma.return.findMany({ where: { saleId: sale.id } });
    expect(returnRecords).toHaveLength(0);
  });

  it("rejects a concurrent duplicate return that would exceed the sold quantity", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      { paymentType: "CASH", items: [{ productId: product.id, quantity: 2 }] },
      testTenantId
    );

    const attempt = () =>
      processReturn(
        sale.id,
        [{ productId: product.id, quantity: 2 }],
        testTenantId,
        "OTRO",
        undefined,
        [{ method: "Efectivo", amount: 50 }]
      );

    const results = await Promise.allSettled([attempt(), attempt()]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ReturnConcurrentConflictError);

    const returnItems = await prisma.returnItem.findMany({
      where: { return: { saleId: sale.id } }
    });
    const totalReturnedQuantity = returnItems.reduce((sum, ri) => sum + ri.quantity, 0);
    expect(totalReturnedQuantity).toBe(2);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stock).toBe(10);
  });

  it("splits a refund across the sale's real payment methods", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      {
        paymentType: "CASH",
        items: [{ productId: product.id, quantity: 4 }],
        paymentDetails: [
          { method: "Efectivo", amount: 60 },
          { method: "Tarjeta", amount: 40 }
        ]
      },
      testTenantId
    );

    const result = await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 2 }],
      testTenantId,
      "OTRO",
      undefined,
      [
        { method: "Efectivo", amount: 30 },
        { method: "Tarjeta", amount: 20, reference: "000999" }
      ]
    );

    expect(result.totalReturned).toBe("50.00");
    const cashMovement = await prisma.cashMovement.findFirstOrThrow({
      where: { source: "RETURN", referenceId: sale.id }
    });
    expect(Number(cashMovement.amount)).toBe(30);

    const returnRecord = await prisma.return.findUniqueOrThrow({ where: { id: result.returnId } });
    expect(returnRecord.refundDetails).toEqual([
      { method: "Efectivo", amount: 30 },
      { method: "Tarjeta", amount: 20, reference: "000999" }
    ]);
  });

  it("rejects a refund amount that exceeds what was originally paid by that method", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      {
        paymentType: "CASH",
        items: [{ productId: product.id, quantity: 4 }],
        paymentDetails: [
          { method: "Efectivo", amount: 60 },
          { method: "Tarjeta", amount: 40 }
        ]
      },
      testTenantId
    );

    await expect(
      processReturn(
        sale.id,
        [{ productId: product.id, quantity: 4 }],
        testTenantId,
        "OTRO",
        undefined,
        [
          { method: "Efectivo", amount: 59.99 },
          { method: "Tarjeta", amount: 40.01, reference: "000999" }
        ]
      )
    ).rejects.toThrow(ReturnValidationError);
  });

  it("rejects a second partial return whose refund would double-pay a method already refunded", async () => {
    const product = await createTestProduct();
    const sale = await createSale(
      {
        paymentType: "CASH",
        items: [{ productId: product.id, quantity: 4 }],
        paymentDetails: [
          { method: "Efectivo", amount: 60 },
          { method: "Tarjeta", amount: 40 }
        ]
      },
      testTenantId
    );

    await processReturn(
      sale.id,
      [{ productId: product.id, quantity: 1 }],
      testTenantId,
      "OTRO",
      undefined,
      [{ method: "Efectivo", amount: 25 }]
    );

    await expect(
      processReturn(
        sale.id,
        [{ productId: product.id, quantity: 3 }],
        testTenantId,
        "OTRO",
        undefined,
        [{ method: "Efectivo", amount: 75 }]
      )
    ).rejects.toThrow(ReturnValidationError);
  });
});

async function createTestProduct() {
  return createProduct(
    {
      name: `${testProductNamePrefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      costPrice: 8,
      salePrice: 25,
      stock: 10
    },
    testTenantId
  );
}

async function deleteReturnTestData() {
  const testTenants = await prisma.tenant.findMany({
    where: { email: testTenantEmail },
    select: { id: true }
  });
  const testTenantIds = testTenants.map((t) => t.id);

  const testSales = await prisma.sale.findMany({
    where: { tenantId: { in: testTenantIds } },
    select: { id: true }
  });
  const testSaleIds = testSales.map((s) => s.id);
  const testReturns = await prisma.return.findMany({
    where: { saleId: { in: testSaleIds } },
    select: { id: true }
  });
  const testReturnIds = testReturns.map((r) => r.id);

  await prisma.cashMovement.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.returnItem.deleteMany({ where: { returnId: { in: testReturnIds } } });
  await prisma.return.deleteMany({ where: { id: { in: testReturnIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.saleItem.deleteMany({ where: { saleId: { in: testSaleIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: testSaleIds } } });
  await prisma.debt.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.product.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.cashRegisterSession.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.productSkuCounter.deleteMany({ where: { tenantId: { in: testTenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: testTenantIds } } });
}
