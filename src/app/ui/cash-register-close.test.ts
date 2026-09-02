import { describe, expect, it } from "vitest";
import { computePaymentMethodBreakdown } from "./cash-register-close";

describe("computePaymentMethodBreakdown", () => {
  it("reconcilia efectivo, tarjeta y una venta mixta (efectivo + tarjeta) contra el total de la sesión", () => {
    const sales = [
      {
        paymentType: "CASH" as const,
        totalAmount: "1000",
        discountAmount: "0",
        paymentDetails: [{ method: "Efectivo", amount: 1000 }],
      },
      {
        paymentType: "CASH" as const,
        totalAmount: "2000",
        discountAmount: "0",
        paymentDetails: [{ method: "Tarjeta", amount: 2000 }],
      },
      {
        paymentType: "CASH" as const,
        totalAmount: "1500",
        discountAmount: "0",
        paymentDetails: [
          { method: "Efectivo", amount: 500 },
          { method: "Tarjeta", amount: 1000 },
        ],
      },
    ];

    const breakdown = computePaymentMethodBreakdown(sales);

    const efectivo = breakdown.rows.find((r) => r.label === "Efectivo");
    const tarjeta = breakdown.rows.find((r) => r.label === "Tarjeta");
    const transferencia = breakdown.rows.find((r) => r.label === "Transferencia");

    expect(efectivo?.amount).toBe(1500);
    expect(tarjeta?.amount).toBe(3000);
    expect(transferencia?.amount ?? 0).toBe(0);
    expect(breakdown.creditAmount).toBe(0);

    const totalSales = sales.reduce(
      (s, sale) => s + (Number(sale.totalAmount) - Number(sale.discountAmount)),
      0
    );
    const reconciled =
      breakdown.rows.reduce((s, r) => s + r.amount, 0) + breakdown.creditAmount;

    expect(reconciled).toBe(totalSales);
  });

  it("suma ventas a crédito puras a la fila Crédito y el resto no cobrado de una venta MIXED", () => {
    const sales = [
      {
        paymentType: "CREDIT" as const,
        totalAmount: "800",
        discountAmount: "0",
        paymentDetails: null,
      },
      {
        paymentType: "MIXED" as const,
        totalAmount: "1000",
        discountAmount: "0",
        paymentDetails: [{ method: "Efectivo", amount: 400 }],
      },
    ];

    const breakdown = computePaymentMethodBreakdown(sales);
    const efectivo = breakdown.rows.find((r) => r.label === "Efectivo");

    expect(efectivo?.amount).toBe(400);
    expect(breakdown.creditAmount).toBe(800 + 600);
    expect(breakdown.creditCount).toBe(2);

    const totalSales = sales.reduce(
      (s, sale) => s + (Number(sale.totalAmount) - Number(sale.discountAmount)),
      0
    );
    const reconciled =
      breakdown.rows.reduce((s, r) => s + r.amount, 0) + breakdown.creditAmount;

    expect(reconciled).toBe(totalSales);
  });
});
