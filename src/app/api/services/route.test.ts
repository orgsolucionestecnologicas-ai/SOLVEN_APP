vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import { createService, listServices } from "../../../modules/services";
import { ServiceValidationError } from "../../../modules/services/service-validation";
import { GET, POST } from "./route";

const mockedRequireRole = vi.mocked(requireRole);

vi.mock("../../../modules/services", () => ({
  createService: vi.fn(),
  listServices: vi.fn()
}));

const mockedCreateService = vi.mocked(createService);
const mockedListServices = vi.mocked(listServices);

describe("services API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists services", async () => {
    const services = [buildServiceRecord()];
    mockedListServices.mockResolvedValueOnce(services);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [serviceJson] });
  });

  it("returns a server error when services cannot be listed", async () => {
    mockedListServices.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "No se pudieron cargar los servicios."
      }
    });
  });

  it("creates a service", async () => {
    const service = buildServiceRecord();
    mockedCreateService.mockResolvedValueOnce(service);

    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        body: JSON.stringify({
          name: "Corte de cabello",
          price: 150
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: serviceJson });
    expect(mockedCreateService).toHaveBeenCalledWith({
      name: "Corte de cabello",
      price: 150
    }, "test-tenant-id");
  });

  it("returns validation errors for invalid service input", async () => {
    mockedCreateService.mockRejectedValueOnce(
      new ServiceValidationError(["El nombre del servicio es requerido."])
    );

    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        body: JSON.stringify({ name: "", price: 100 })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Datos de servicio inválidos.",
        details: ["El nombre del servicio es requerido."]
      }
    });
  });

  it("returns 403 when the role is not authorized to create services", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        body: JSON.stringify({ name: "Corte de cabello", price: 150 })
      })
    );

    expect(response.status).toBe(403);
    expect(mockedCreateService).not.toHaveBeenCalled();
  });
});

const serviceJson = {
  id: "service-1",
  code: "SRV-0001",
  name: "Corte de cabello",
  description: null,
  price: "150.00",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function buildServiceRecord(): Awaited<ReturnType<typeof createService>> {
  return {
    ...serviceJson,
    createdAt: new Date(serviceJson.createdAt),
    updatedAt: new Date(serviceJson.updatedAt)
  } as unknown as Awaited<ReturnType<typeof createService>>;
}
