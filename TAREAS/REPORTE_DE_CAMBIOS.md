# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## POS-FIX-01..04 — Descuentos, promociones, permisos GET /api/sales, doble confirmación de cotización — 2026-08-31

4 bugs confirmados por INGENIERODETESTEO (`TAREAS/ordenestest.md`), los 4 en un solo commit (`481852f`) por instrucción explícita de la orden.

### POS-FIX-01 — Descuentos manuales del POS ignorados por el backend
- `sale-validation.ts`: `CreateSaleItemInput` acepta `discount`/`discountType` (`"percent" | "fixed"`) por ítem; nueva función exportada `validateGlobalDiscount(globalDiscountType, globalDiscountValue)` para el descuento global del carrito. Clampea porcentajes > 100 a 100, rechaza valores negativos o no numéricos, default de tipo `"percent"`.
- `sale-data-access.ts` / `createSale`: nuevo helper `computeManualLineDiscount` aplica el descuento de ítem clampeado al total de esa línea; el descuento global se calcula sobre el neto post-descuentos de ítem/promoción.
- Antes: `pos.tsx` calculaba y mostraba estos descuentos en pantalla pero nunca se aplicaban al monto real cobrado.

### POS-FIX-02 — discountAmount/promotionIds del cliente aceptados sin validar
- `createSale` ya no usa el `discountAmount`/`promotionIds` del payload. Recalcula server-side contra las promociones activas del tenant vía `applyPromotionsToCart` (`promotion-engine.ts`) y combina el resultado con los descuentos manuales de POS-FIX-01: `discountAmount = min(totalAmount, promoción + manual-ítem + global)`.
- Un `promotionId` inexistente o inactivo se descarta en silencio — la venta se crea igual, sin ese descuento, en vez de rechazarse.
- `PromotionUsage` ahora se crea solo por promociones efectivamente aplicadas, con el monto real por promoción (antes repartía el descuento total en partes iguales entre los `promotionIds` recibidos, sin verificar que existieran).

### POS-FIX-03 — GET /api/sales sin chequeo de rol
- `src/app/api/sales/route.ts`: `GET` pasó de `requireTenantId()` a `requireRole(["OWNER","CASHIER"], "pos")`, igual que `POST`. Mismo manejo de `ForbiddenError`/`UnauthorizedError` que ya tenía `POST`.
- No se tocó el mismo patrón en otras rutas (fuera de alcance explícito de la orden).

### POS-FIX-04 — Doble confirmación de cotización sin protección atómica
- `quote-data-access.ts` / `confirmQuote`: el `update` final de la transacción pasó a `updateMany({ where: { id: quoteId, status: { not: "CONFIRMED" } }, ... })` + chequeo de `count`; si `count === 0` lanza `QuoteAlreadyConfirmedError` (ya mapeado a HTTP 409 en la ruta, sin cambios ahí).
- Protege contra dos confirmaciones concurrentes de la misma cotización (doble click, dos pestañas), no solo la secuencial que ya bloqueaba el chequeo de status previo a la transacción.

### Tests
- `sale-validation.test.ts`: 4 tests nuevos para descuento de ítem, 7 para `validateGlobalDiscount`.
- `sale-data-access.integration.test.ts`: 6 tests nuevos (descuento forjado ignorado, clamp de descuento fijo por línea, descuento global porcentual, stacking ítem+global, `promotionId` inexistente ignorado, promoción real recalculada server-side ignorando `discountAmount` forjado) + 1 test existente corregido para reflejar el nuevo shape de descuento por ítem.
- `sales/route.test.ts`: 1 test nuevo (403 cuando el rol no puede listar ventas), mismo patrón que `debts/route.test.ts`.
- `quote-data-access.integration.test.ts` (nuevo archivo): confirmación única con baja de stock, rechazo de segunda confirmación secuencial, y confirmación concurrente (`Promise.allSettled`) verificando que solo una de las dos gane y el stock baje una sola vez.

### Validación
- `npm run lint`, `npm run typecheck` y `npm test` — 352 passed / 2 skipped (preexistentes, no relacionados).

---
