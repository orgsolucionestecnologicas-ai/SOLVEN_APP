vi.mock("@/lib/tenant", () => ({ requireTenantId: vi.fn().mockResolvedValue("test-tenant-id") }));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCustomer, listCustomers } from "../../../modules/customers";
import { CustomerValidationError } from "../../../modules/customers/customer-validation";
import { GET, POST } from "./route";

vi.mock("../../../modules/customers", () => ({
  createCustomer: vi.fn(),
  listCustomers: vi.fn()
}));

const mockedCreateCustomer = vi.mocked(createCustomer);
const mockedListCustomers = vi.mocked(listCustomers);

describe("customers API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists customers", async () => {
    const customers = [buildCustomerRecord()];
    mockedListCustomers.mockResolvedValueOnce(customers);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [customerJson] });
  });

  it("returns a server error when customers cannot be listed", async () => {
    mockedListCustomers.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "Could not load customers."
      }
    });
  });

  it("creates a customer", async () => {
    const customer = buildCustomerRecord();
    mockedCreateCustomer.mockResolvedValueOnce(customer);

    const response = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: "Maria Lopez"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: customerJson });
    expect(mockedCreateCustomer).toHaveBeenCalledWith({
      name: "Maria Lopez"
    }, "test-tenant-id");
  });

  it("returns validation errors for invalid customer input", async () => {
    mockedCreateCustomer.mockRejectedValueOnce(
      new CustomerValidationError(["Customer name is required."])
    );

    const response = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: ""
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Invalid customer input.",
        details: ["Customer name is required."]
      }
    });
  });
});

const customerJson = {
  id: "customer-1",
  tenantId: "tenant-1",
  name: "Maria Lopez",
  phone: null,
  email: null,
  customerCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function buildCustomerRecord(): Awaited<ReturnType<typeof createCustomer>> {
  return {
    ...customerJson,
    phone: null,
    email: null,
    customerCode: null,
    createdAt: new Date(customerJson.createdAt),
    updatedAt: new Date(customerJson.updatedAt)
  };
}
