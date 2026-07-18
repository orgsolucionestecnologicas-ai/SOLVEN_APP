# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

FIX-08 (prioridad máxima, hallazgo del Ingeniero Líder — `CLAUDE.md` sección 5, bug documentado y nunca corregido hasta ahora) — 2026-07-18. `POST /api/invoices` recibía `items` y `total` del cliente y los pasaba tal cual a `emitInvoice()`, que nunca verificaba que la venta (`saleId`) perteneciera al tenant del usuario autenticado ni que `items`/`total` coincidieran con la venta real — cualquier `OWNER`/`CASHIER` podía emitir una factura electrónica real con CAE real de AFIP usando un `saleId` de otro tenant y montos inventados.

- `src/modules/invoices/invoice-data-access.ts`: `emitInvoice()` ahora hace `prisma.sale.findFirst({ where: { id: input.saleId, tenantId: input.tenantId }, include: { items: { include: { product: true, service: true } } } })` antes de construir el comprobante; si `sale` es `null` (venta inexistente o de otro tenant) lanza `ARCAError("La venta no fue encontrada para este comercio.")`. Los `items` del voucher (`CartItemForInvoice[]`) se arman desde `sale.items` (`product?.name ?? service?.name` para el nombre, `quantity`/`unitPrice`/`ivaRate` directos de cada `SaleItem`), y el `total` del voucher es `Number(sale.totalAmount)` — `input.items`/`input.total` ya no existen como parámetros de `emitInvoice` (se quitaron del tipo `EmitInvoiceInput`, que ahora solo acepta `tenantId`, `saleId`, `docTipo`, `docNro`, `concepto`), por lo que es imposible volver a pasar datos del cliente por error de tipos. No se tocó `getARCACredentials`, `buildARCAVoucher`, `requestCAE` ni ningún archivo bajo `src/lib/arca/`.
- `src/app/api/invoices/route.ts`: se quitó la lectura/validación de `items`/`total` del body. `docTipo` ahora se valida contra los 3 valores permitidos (`99` Consumidor Final, `96` DNI, `80` CUIT) en vez de aceptar cualquier número. La llamada a `emitInvoice(...)` ya no pasa `items`/`total`. `docNro`/`concepto` sin cambios de comportamiento. (Nota: el frontend `pos.tsx` sigue enviando `items`/`total` en el body del POST — quedan como campos muertos, ignorados por el route handler; no se tocó `pos.tsx` por estar fuera del alcance de archivos esperados de esta tarea, y enviarlos de más no rompe nada ni representa un riesgo.)

**Reconciliación de montos**: `sale.totalAmount` se define, al crear la venta (`sale-data-access.ts`), como la suma exacta de `SaleItem.total` de todos los ítems — `discountAmount` se registra aparte (para `PromotionUsage`) pero nunca se resta de `totalAmount`; el descuento ya viene aplicado en el `unitPrice` de cada ítem antes de guardarse. Por lo tanto, recalcular `impNeto`/`impIVA` desde `sale.items` y usar `sale.totalAmount` como `impTotal` del voucher reconcilia exactamente por construcción — no se necesitó ningún ajuste manual ni redondeo especial más allá del `round2()` que ya existe en `buildARCAVoucher` (no tocado).

**Tests nuevos**: `src/modules/invoices/invoice-data-access.test.ts` (unitario, mockeando `@/lib/prisma` y `@/lib/arca` — no pega a AFIP real) cubre: recalcula items/total desde la venta real e ignora cualquier dato ajeno; un `saleId` de otro tenant (o inexistente) es rechazado con `ARCAError` antes de siquiera pedir credenciales ARCA; la doble facturación sigue bloqueada; falta de config ARCA lanza `ARCAConfigError`; el resto del flujo (`getARCACredentials`, `getLastVoucherNumber`, `requestCAE`, `prisma.invoice.create`) se sigue llamando igual que antes. `src/app/api/invoices/route.test.ts` (nuevo, no existía ningún test para esta ruta) cubre 403/401 por rol, 400 por `saleId` faltante y por `docTipo` inválido/faltante, que los 3 `docTipo` permitidos son aceptados y que `items`/`total` enviados por un cliente atacante nunca llegan a `emitInvoice`, 201 en el camino feliz, y 422 con el mensaje de `ARCAError` para venta no encontrada y doble facturación.

**Validación**: `npm run typecheck` y `npm run lint` sin errores. `npm test`: 250 passed / 2 skipped (252), sin regresiones — incluye los 15 tests nuevos (5 + 10). Commit `d4b2c83`.

**Restricciones respetadas**: no se tocó `src/lib/arca/*`; ningún test pega a AFIP real (todo mockeado); `docTipo`/`docNro`/`concepto` sin más cambios que la validación de los 3 valores permitidos; no se inventó ningún ajuste de reconciliación — `sale.totalAmount` es la fuente de verdad, tal como ya lo usa el resto del sistema.

---

UI-01, UI-02 y FIX-07 revisados y verificados por el Ingeniero Líder (diffs confirmados contra lo pedido en cada orden: nav de Devoluciones movido a pestaña de Ventas con visibilidad por rol preservada; buscador/filtro/badge/resumen en el historial; selector de método de reintegro con migración `refundMethod` en `Return` y el `CashMovement` condicionado a `refundMethod === "Efectivo"`) — 2026-07-17. Órdenes archivadas, ya cumplieron su función. Resúmenes completos en `TAREAS/REPORTELIDER.md`.
