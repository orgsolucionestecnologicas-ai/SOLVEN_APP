import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPromotion,
  listPromotions,
  PromotionValidationError,
  type PromotionWithUsageCount
} from "../../../modules/promotions";
import { GET, POST } from "./route";

vi.mock("../../../modules/promotions", () => ({
  createPromotion: vi.fn(),
  listPromotions: vi.fn(),
  PromotionValidationError: class PromotionValidationError extends Error {
    constructor(public reasons: string[]) {
      super(reasons.join(" "));
      this.name = "PromotionValidationError";
    }
  }
}));

const mockedListPromotions = vi.mocked(listPromotions);
const mockedCreatePromotion = vi.mocked(createPromotion);

describe("promotions API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists promotions", async () => {
    const promotions = [buildPromotionRecord()];
    mockedListPromotions.mockResolvedValueOnce(promotions);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });

  it("returns server error when promotions cannot be listed", async () => {
    mockedListPromotions.mockRejectedValueOnce(new Error("DB error"));

    const response = await GET();

    expect(response.status).toBe(500);
    const body = (await response.json()) as {
      error: { message: string };
    };
    expect(body.error.message).toBe("No se pudieron cargar las promociones.");
  });

  it("creates a valid promotion", async () => {
    const promotion = buildPromotionRecord();
    mockedCreatePromotion.mockResolvedValueOnce(promotion);

    const response = await POST(
      new Request("http://localhost/api/promotions", {
        method: "POST",
        body: JSON.stringify(buildCreateInput())
      })
    );

    expect(response.status).toBe(201);
    expect(mockedCreatePromotion).toHaveBeenCalledWith(buildCreateInput());
  });

  it("returns 400 with validation errors for invalid promotion input", async () => {
    mockedCreatePromotion.mockRejectedValueOnce(
      new PromotionValidationError(["El nombre de la promoción es requerido."])
    );

    const response = await POST(
      new Request("http://localhost/api/promotions", {
        method: "POST",
        body: JSON.stringify({ type: "PERCENTAGE" })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { message: string; details: string[] };
    };
    expect(body.error.message).toBe("Datos de promoción inválidos.");
    expect(body.error.details).toContain(
      "El nombre de la promoción es requerido."
    );
  });

  it("returns 400 for non-JSON request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/promotions", {
        method: "POST",
        body: "not json"
      })
    );

    expect(response.status).toBe(400);
  });
});

function buildCreateInput() {
  return {
    name: "Black Friday 10%",
    type: "PERCENTAGE",
    discountValue: 10,
    application: "ALL_PRODUCTS",
    activationType: "AUTOMATIC",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-12-31T23:59:59.000Z"
  };
}

function buildPromotionRecord(): PromotionWithUsageCount {
  return {
    id: "promo-1",
    name: "Black Friday 10%",
    code: null,
    type: "PERCENTAGE",
    discountValue: { toNumber: () => 10 } as unknown as import("@prisma/client").Prisma.Decimal,
    application: "ALL_PRODUCTS",
    categoryName: null,
    productAId: null,
    productBId: null,
    productBDiscount: null,
    minimumAmount: null,
    fixedPrice: null,
    activationType: "AUTOMATIC",
    startsAt: new Date("2026-01-01"),
    endsAt: new Date("2026-12-31"),
    daysOfWeek: null,
    maxUsages: null,
    maxUsagesPerCustomer: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { usages: 0 }
  };
}
