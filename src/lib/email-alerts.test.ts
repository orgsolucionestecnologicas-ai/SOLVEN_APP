vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeSettings: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
    productLowStockAlert: { findMany: vi.fn(), upsert: vi.fn() }
  }
}));

vi.mock("@/lib/email", () => ({
  sendLowStockAlertEmail: vi.fn(),
  sendCashRegisterDifferenceAlertEmail: vi.fn()
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { sendLowStockAlertEmail } from "@/lib/email";
import { notifyLowStockIfEnabled } from "./email-alerts";

const mockedStoreSettingsFindUnique = vi.mocked(prisma.storeSettings.findUnique);
const mockedUserFindFirst = vi.mocked(prisma.user.findFirst);
const mockedAlertFindMany = vi.mocked(prisma.productLowStockAlert.findMany);
const mockedAlertUpsert = vi.mocked(prisma.productLowStockAlert.upsert);
const mockedSendLowStockAlertEmail = vi.mocked(sendLowStockAlertEmail);

describe("notifyLowStockIfEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStoreSettingsFindUnique.mockResolvedValue({ lowStockEmailAlerts: true, businessName: "SOLVEN" } as never);
    mockedUserFindFirst.mockResolvedValue({ email: "owner@test.internal" } as never);
    mockedAlertFindMany.mockResolvedValue([]);
  });

  it("does nothing when the tenant has low stock alerts disabled", async () => {
    mockedStoreSettingsFindUnique.mockResolvedValue({ lowStockEmailAlerts: false } as never);

    await notifyLowStockIfEnabled("tenant-1", [{ id: "product-1", name: "Producto", stock: 1 }]);

    expect(mockedSendLowStockAlertEmail).not.toHaveBeenCalled();
  });

  it("sends the alert and records the notification when the product was not recently notified", async () => {
    await notifyLowStockIfEnabled("tenant-1", [{ id: "product-1", name: "Producto", stock: 1 }]);

    expect(mockedSendLowStockAlertEmail).toHaveBeenCalledWith(
      "owner@test.internal",
      "SOLVEN",
      [{ id: "product-1", name: "Producto", stock: 1 }]
    );
    expect(mockedAlertUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: "product-1" } })
    );
  });

  it("skips products that were already notified within the throttle window", async () => {
    mockedAlertFindMany.mockResolvedValue([{ productId: "product-1" }] as never);

    await notifyLowStockIfEnabled("tenant-1", [{ id: "product-1", name: "Producto", stock: 1 }]);

    expect(mockedSendLowStockAlertEmail).not.toHaveBeenCalled();
    expect(mockedAlertUpsert).not.toHaveBeenCalled();
  });

  it("only notifies the products not recently notified out of a mixed batch", async () => {
    mockedAlertFindMany.mockResolvedValue([{ productId: "product-1" }] as never);

    await notifyLowStockIfEnabled("tenant-1", [
      { id: "product-1", name: "Ya notificado", stock: 1 },
      { id: "product-2", name: "Nuevo", stock: 2 }
    ]);

    expect(mockedSendLowStockAlertEmail).toHaveBeenCalledWith(
      "owner@test.internal",
      "SOLVEN",
      [{ id: "product-2", name: "Nuevo", stock: 2 }]
    );
  });
});
