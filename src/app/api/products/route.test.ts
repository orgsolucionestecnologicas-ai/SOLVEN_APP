vi.mock("@/lib/tenant", () => ({ requireTenantId: vi.fn().mockResolvedValue("test-tenant-id") }));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductValidationError } from "../../../modules/products/product-validation";
import { createProduct, listProducts } from "../../../modules/products";
import { GET, POST } from "./route";

vi.mock("../../../modules/products", () => ({
  createProduct: vi.fn(),
  listProducts: vi.fn()
}));

const mockedCreateProduct = vi.mocked(createProduct);
const mockedListProducts = vi.mocked(listProducts);

describe("products API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists products", async () => {
    const products = [buildProductRecord()];
    mockedListProducts.mockResolvedValueOnce({ data: products, total: 1 } as never);

    const response = await GET(new Request("http://localhost/api/products"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ data: [productJson] }));
  });

  it("returns a server error when products cannot be listed", async () => {
    mockedListProducts.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET(new Request("http://localhost/api/products"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "No se pudieron cargar los productos."
      }
    });
  });

  it("creates a product", async () => {
    const product = buildProductRecord();
    mockedCreateProduct.mockResolvedValueOnce(product);

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Rice",
          costPrice: 10,
          salePrice: 15,
          stock: 20
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: productJson });
    expect(mockedCreateProduct).toHaveBeenCalledWith({
      name: "Rice",
      costPrice: 10,
      salePrice: 15,
      stock: 20
    }, "test-tenant-id");
  });

  it("returns validation errors for invalid product input", async () => {
    mockedCreateProduct.mockRejectedValueOnce(
      new ProductValidationError(["Product name is required."])
    );

    const response = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: "",
          costPrice: 10,
          salePrice: 15,
          stock: 20
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Invalid product input.",
        details: ["Product name is required."]
      }
    });
  });
});

const productJson = {
  id: "product-1",
  name: "Rice",
  costPrice: "10.00",
  salePrice: "15.00",
  stock: 20,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function buildProductRecord(): Awaited<ReturnType<typeof createProduct>> {
  return {
    ...productJson,
    createdAt: new Date(productJson.createdAt),
    updatedAt: new Date(productJson.updatedAt)
  } as unknown as Awaited<ReturnType<typeof createProduct>>;
}
