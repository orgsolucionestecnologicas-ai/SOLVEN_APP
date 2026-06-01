vi.mock("@/lib/tenant", () => ({ requireTenantId: vi.fn().mockResolvedValue("test-tenant-id") }));

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardSummary } from "../../../../modules/dashboard";
import { GET } from "./route";

vi.mock("../../../../modules/dashboard", () => ({
  getDashboardSummary: vi.fn()
}));

const mockedGetDashboardSummary = vi.mocked(getDashboardSummary);

describe("dashboard summary API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns dashboard summary metrics", async () => {
    mockedGetDashboardSummary.mockResolvedValueOnce(buildDashboardSummary());

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: dashboardSummaryJson
    });
  });

  it("returns an error when dashboard summary cannot be loaded", async () => {
    mockedGetDashboardSummary.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "Could not load dashboard summary."
      }
    });
  });
});

const dashboardSummaryJson = {
  totalSalesAmount: "120.5",
  totalExpensesAmount: "35.25",
  totalCashIn: "150",
  totalCashOut: "45",
  currentCashBalance: "105",
  totalDebtRemaining: "80",
  totalProducts: 10,
  lowStockProductsCount: 3
};

function buildDashboardSummary(): Awaited<
  ReturnType<typeof getDashboardSummary>
> {
  return {
    totalSalesAmount: new Prisma.Decimal(
      dashboardSummaryJson.totalSalesAmount
    ),
    totalExpensesAmount: new Prisma.Decimal(
      dashboardSummaryJson.totalExpensesAmount
    ),
    totalCashIn: new Prisma.Decimal(dashboardSummaryJson.totalCashIn),
    totalCashOut: new Prisma.Decimal(dashboardSummaryJson.totalCashOut),
    currentCashBalance: new Prisma.Decimal(
      dashboardSummaryJson.currentCashBalance
    ),
    totalDebtRemaining: new Prisma.Decimal(
      dashboardSummaryJson.totalDebtRemaining
    ),
    totalProducts: dashboardSummaryJson.totalProducts,
    lowStockProductsCount: dashboardSummaryJson.lowStockProductsCount
  };
}
