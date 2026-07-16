vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  requireRole: vi.fn().mockResolvedValue({ tenantId: "test-tenant-id", userId: "test-user-id", role: "OWNER" }),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, requireRole } from "@/lib/tenant";
import { getSettings, upsertSettings } from "../../../modules/settings";
import { SettingsValidationError } from "../../../modules/settings/settings-validation";
import { GET, PATCH } from "./route";

vi.mock("../../../modules/settings", () => ({
  getSettings: vi.fn(),
  upsertSettings: vi.fn()
}));

const mockedGetSettings = vi.mocked(getSettings);
const mockedUpsertSettings = vi.mocked(upsertSettings);
const mockedRequireRole = vi.mocked(requireRole);

describe("settings API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the settings", async () => {
    mockedGetSettings.mockResolvedValueOnce(buildSettingsRecord());

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: settingsJson });
  });

  it("returns 403 when the role is not authorized to read settings", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockedGetSettings).not.toHaveBeenCalled();
  });

  it("returns a server error when settings cannot be loaded", async () => {
    mockedGetSettings.mockRejectedValueOnce(new Error("Database error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "No se pudo cargar la configuración."
      }
    });
  });

  it("updates the settings", async () => {
    mockedUpsertSettings.mockResolvedValueOnce(buildSettingsRecord());

    const response = await PATCH(
      new Request("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ businessName: "SOLVEN Test" })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: settingsJson });
  });

  it("returns 403 when the role is not authorized to update settings", async () => {
    mockedRequireRole.mockRejectedValueOnce(new ForbiddenError());

    const response = await PATCH(
      new Request("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ businessName: "SOLVEN Test" })
      })
    );

    expect(response.status).toBe(403);
    expect(mockedUpsertSettings).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid settings input", async () => {
    mockedUpsertSettings.mockRejectedValueOnce(
      new SettingsValidationError(["El nombre del negocio es requerido."])
    );

    const response = await PATCH(
      new Request("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ businessName: "" })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        message: "Datos de configuración inválidos.",
        details: ["El nombre del negocio es requerido."]
      }
    });
  });
});

const settingsJson = {
  id: "settings-1",
  tenantId: "test-tenant-id",
  businessName: "SOLVEN Test",
  logoUrl: "",
  receiptFooterMessage: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

function buildSettingsRecord(): Awaited<ReturnType<typeof getSettings>> {
  return {
    ...settingsJson,
    createdAt: new Date(settingsJson.createdAt),
    updatedAt: new Date(settingsJson.updatedAt)
  } as unknown as Awaited<ReturnType<typeof getSettings>>;
}
