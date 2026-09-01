vi.mock("@/lib/tenant", () => ({
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

vi.mock("@/modules/audit", () => ({
  logAudit: vi.fn()
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import { logAudit } from "@/modules/audit";
import { DELETE } from "./route";

vi.mock("../../../../modules/products", () => ({
  getProductById: vi.fn(),
  updateProduct: vi.fn(),
  ProductValidationError: class ProductValidationError extends Error {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findFirst: vi.fn(), delete: vi.fn() },
    saleItem: { findFirst: vi.fn() },
    inventoryMovement: { findFirst: vi.fn() }
  }
}));

import { prisma } from "@/lib/prisma";

const mockedRequireRole = vi.mocked(requireRole);
const mockedProductFindFirst = vi.mocked(prisma.product.findFirst);
const mockedProductDelete = vi.mocked(prisma.product.delete);
const mockedSaleItemFindFirst = vi.mocked(prisma.saleItem.findFirst);
const mockedInventoryMovementFindFirst = vi.mocked(prisma.inventoryMovement.findFirst);
const mockedLogAudit = vi.mocked(logAudit);

describe("products/[id] DELETE route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireRole.mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" });
  });

  it("returns 403 when the role is not authorized to delete a product", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await DELETE(new Request("http://localhost/api/products/product-1"), {
      params: Promise.resolve({ id: "product-1" })
    });

    expect(response.status).toBe(403);
    expect(mockedProductFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the product does not exist for the tenant", async () => {
    mockedProductFindFirst.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/products/product-1"), {
      params: Promise.resolve({ id: "product-1" })
    });

    expect(response.status).toBe(404);
  });

  it("blocks deletion when the product has sales history", async () => {
    mockedProductFindFirst.mockResolvedValue({ id: "product-1", name: "Producto" } as never);
    mockedSaleItemFindFirst.mockResolvedValue({ id: "sale-item-1" } as never);

    const response = await DELETE(new Request("http://localhost/api/products/product-1"), {
      params: Promise.resolve({ id: "product-1" })
    });

    expect(response.status).toBe(400);
    expect(mockedProductDelete).not.toHaveBeenCalled();
  });

  it("blocks deletion when the product has inventory movement history", async () => {
    mockedProductFindFirst.mockResolvedValue({ id: "product-1", name: "Producto" } as never);
    mockedSaleItemFindFirst.mockResolvedValue(null);
    mockedInventoryMovementFindFirst.mockResolvedValue({ id: "movement-1" } as never);

    const response = await DELETE(new Request("http://localhost/api/products/product-1"), {
      params: Promise.resolve({ id: "product-1" })
    });

    expect(response.status).toBe(400);
    expect(mockedProductDelete).not.toHaveBeenCalled();
  });

  it("deletes the product and logs an audit entry when it has no history", async () => {
    mockedProductFindFirst.mockResolvedValue({ id: "product-1", name: "Producto" } as never);
    mockedSaleItemFindFirst.mockResolvedValue(null);
    mockedInventoryMovementFindFirst.mockResolvedValue(null);
    mockedProductDelete.mockResolvedValue({ id: "product-1" } as never);

    const response = await DELETE(new Request("http://localhost/api/products/product-1"), {
      params: Promise.resolve({ id: "product-1" })
    });

    expect(response.status).toBe(200);
    expect(mockedProductDelete).toHaveBeenCalledWith({ where: { id: "product-1", tenantId: "test-tenant-id" } });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PRODUCT_DELETED", entityId: "product-1", userId: "test-user-id" })
    );
  });
});
