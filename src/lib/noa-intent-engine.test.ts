import { describe, expect, it } from "vitest";

import { detectNoaIntent } from "./noa-intent-engine";

describe("NOA intent engine", () => {
  it("detecta productos sin stock", () => {
    const intent = detectNoaIntent("Que producto no tiene stock?");
    expect(intent).toMatchObject({ type: "data", name: "productos_bajo_stock" });
  });

  it("detecta detalle de venta por folio", () => {
    const intent = detectNoaIntent("Que llevo Garcia en la venta 0042?");
    expect(intent).toMatchObject({ type: "data", name: "detalle_venta" });
    expect(intent.params.folio).toBe(42);
  });

  it("detecta rango de mayo a junio", () => {
    const intent = detectNoaIntent("Buscame una factura de Garcia de mayo o junio");
    expect(intent).toMatchObject({ type: "data", name: "buscar_ventas" });
    expect(intent.params.receiptType).toBe("INVOICE");
    expect(intent.params.dateFrom).toMatch(/-05-01$/);
    expect(intent.params.dateTo).toMatch(/-06-30$/);
  });

  it("rechaza fuera de dominio", () => {
    const intent = detectNoaIntent("Como esta el clima?");
    expect(intent.type).toBe("out_of_scope");
  });
});
