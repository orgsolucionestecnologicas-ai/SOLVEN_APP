# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

QA-FIX-04 revisado y verificado por el Ingeniero Líder (diff de app-shell.tsx confirmado, 19 líneas, exactamente lo pedido) — 2026-07-17. **Ciclo de QA 1 cerrado por completo: los 10 hallazgos resueltos.** Único punto restante (gastos recurrentes sin pantalla de gestión) es una feature fuera de alcance, no un bug.

---

QA-FIX-05 (bug nuevo, reportado por Diego en uso real, fuera del ciclo de QA) — 2026-07-17. Causa raíz ya venía identificada en la tarea: `submitSale()` en `src/app/ui/pos.tsx` reseteaba el carrito tras una venta exitosa pero no incluía `setSaleGateResult(null)`, a diferencia de `clearSale()` que sí lo hace. Como los checks de "¿puedo agregar producto?" / "¿puedo cobrar?" solo verifican `saleGateResult !== null`, el cajero podía seguir vendiendo con el vendedor/tipo de comprobante de la venta anterior sin que el sistema volviera a pedir `SaleGateModal`. Fix mínimo aplicado: se agregó `setSaleGateResult(null);` en el bloque de reseteo de `submitSale()` (junto a `setGlobalDiscountValue`, antes de `setProductsRefreshKey`), un solo archivo (`pos.tsx`), una sola línea. Se evaluó la alternativa de que `submitSale()` llame a `clearSale()` directamente, pero se descartó por riesgo de reordenar side-effects (`setLastSale`, `setShowPrintModal` deben ejecutarse después con datos del servidor) — se mantuvo el fix mínimo de una línea. Verificado por lectura de código: los 5 checks de gate (líneas ~1659, 1769, 1904, 2590, 2594) y el prompt "Hacé clic en Nueva venta" (línea ~2081) dependen solo de `saleGateResult`, así que quedan correctamente bloqueados tras la venta; el modal de impresión de ticket (`setShowPrintModal`, línea ~1434) arma sus datos (`receiptType`, `receiptNumber`, `sellerCode`) desde `body.data` (respuesta del servidor), no desde `saleGateResult`, por lo que el ticket de la venta recién completada no se ve afectado por el reset. Sin test de componente nuevo (no hay infraestructura de tests React en el proyecto, igual que en QA-FIX-04). `npm run typecheck` y `npm run lint` sin errores. `npm test`: 227 passed / 1 failed / 2 skipped (230) — la única falla es `debt-payment-data-access.integration.test.ts > prevents concurrent payments from overpaying a debt` (`PrismaClientKnownRequestError` en vez de `DebtPaymentAmountError`), la misma falla de concurrencia preexistente documentada en QA-FIX-04, confirmada no relacionada: el `git diff` de esta tarea toca solo `pos.tsx` (1 línea), no tiene ninguna relación con el módulo de pagos de deuda. A diferencia de QA-FIX-04 (donde pasó aislada 4/4), esta vez falló también aislada y repetida 3 veces seguidas — parece haberse vuelto más consistente, no solo flaky bajo carga del suite completo. Queda documentado para que Diego decida si amerita una tarea propia de investigación del test de concurrencia en `debt-payment-data-access`.
