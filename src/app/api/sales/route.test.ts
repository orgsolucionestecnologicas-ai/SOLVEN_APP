import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSale,
  listSales,
  SaleInsufficientStockError,
  SaleProductNotFoundError,
  type SaleListRecord,
  type SaleWithItems
} from "../../../modules/sales";
import { SaleValidationError } from "../../../modules/sales/sale-validation";
import { GET, POST } from "./route";

vi.mock("../../../modules/sales", () => ({
  createSale: vi.fn(),
  listSales: vi.fn(),
  SaleInsufficientStockError: class SaleInsufficientStockError extends Error {
    constructor(productName: string) {
      super(`Product ${productName} does not have enough stock.`);
      this.name = "SaleInsufficientStockError";
    }
  },
  SaleProductNotFoundError: class SaleProductNotFoundError extends Error {
    constructor(productId: string) {
      super(`Product ${productId} was not found.`);
      this.name = "SaleProductNotFoundError";
    }
  }
}));

const mockedCreateSale = vi.mocked(createSale);
const mockedListSales = vi.mocked(listSales);

describe("sales API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists sales", async () => {
    const sales = [buildSaleRecord()];
    mockedListSales.mockResolvedValueOnce(sales);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [saleJson] });
  });

  it("returns a server error when sales cannot be listed", async () => {
    mockedListSales.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "Could not load sales."
      }
    });
  });

  it("creates a sale", async () => {
    const sale = buildSaleRecord();
    mockedCreateSale.mockResolvedValueOnce(sale);

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              productId: "product-1",
              quantity: 2
            }
          ]
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: saleJson });
    expect(mockedCreateSale).toHaveBeenCalledWith({
      items: [
        {
          productId: "product-1",
          quantity: 2
        }
      ]
    });
  });

  it("returns validation errors for invalid sale input", async () => {
    mockedCreateSale.mockRejectedValueOnce(
      new SaleValidationError(["A sale must include at least one item."])
    );

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: []
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Invalid sale input.",
        details: ["A sale must include at least one item."]
      }
    });
  });

  it("returns an error when a product does not exist", async () => {
    mockedCreateSale.mockRejectedValueOnce(
      new SaleProductNotFoundError("product-1")
    );

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              productId: "product-1",
              quantity: 1
            }
          ]
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Product product-1 was not found."
      }
    });
  });

  it("returns an error when product stock is insufficient", async () => {
    mockedCreateSale.mockRejectedValueOnce(
      new SaleInsufficientStockError("Rice")
    );

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              productId: "product-1",
              quantity: 10
            }
          ]
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Product Rice does not have enough stock."
      }
    });
  });

  it("returns an error when the credit sale customer does not exist", async () => {
    mockedCreateSale.mockRejectedValueOnce(buildPrismaNotFoundError());

    const response = await POST(
      new Request("http://localhost/api/sales", {
        method: "POST",
        body: JSON.stringify({
          paymentType: "CREDIT",
          customerId: "missing-customer",
          items: [
            {
              productId: "product-1",
              quantity: 1
            }
          ]
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Customer was not found."
      }
    });
  });
});

const saleJson = {
  id: "sale-1",
  saleDate: "2026-01-01T00:00:00.000Z",
  paymentType: "CASH",
  customerId: null,
  debtId: null,
  totalAmount: "30.00",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  customer: null,
  items: [
    {
      id: "sale-item-1",
      saleId: "sale-1",
      productId: "product-1",
      quantity: 2,
      unitPrice: "15.00",
      total: "30.00",
      product: { name: "Producto test" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]
};

function buildSaleRecord(): SaleListRecord & SaleWithItems {
  return {
    ...saleJson,
    saleDate: new Date(saleJson.saleDate),
    createdAt: new Date(saleJson.createdAt),
    updatedAt: new Date(saleJson.updatedAt),
    items: saleJson.items.map((saleItem) => ({
      ...saleItem,
      createdAt: new Date(saleItem.createdAt),
      updatedAt: new Date(saleItem.updatedAt)
    }))
  } as unknown as SaleListRecord & SaleWithItems;
}

function buildPrismaNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "test"
  });
}
