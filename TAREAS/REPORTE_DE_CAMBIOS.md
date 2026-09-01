# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## 2026-09-02 — COT-FIX-01..08: cierre de bugs de Cotizaciones (INGENIERODETESTEO)

Orden ejecutada: `TAREAS/ordenestest.md` → "Cotizaciones — auditado 01-09-2026" → "Bugs confirmados" (COT-FIX-01 a 08). Commit `e4edb30`.

**COT-FIX-01 — Caja abierta obligatoria para confirmar cotización**
`src/modules/quotes/quote-data-access.ts` (`confirmQuote`): agregado `await requireOpenCashRegisterSession(tenantId, tx)` como primera operación dentro de la transacción, mismo patrón que `sale-data-access.ts`. `CashRegisterNoSessionOpenError` se propaga y se mapea a 409 en `src/app/api/quotes/[id]/confirm/route.ts`.

**COT-FIX-02 + COT-FIX-05 — Monto neto en el movimiento de caja/deuda, descuento acotado al total**
`quote-data-access.ts` `createQuote`: `discountAmount` ahora se acota con `Prisma.Decimal.min(discountAmountInput, total)` antes de guardar la cotización. `confirmQuote`: se calcula `netTotal = totalAmount.minus(discountAmount)` y se usa como `amount` del `CashMovement` (o como monto de la `Debt` en caso de Crédito) en vez del total bruto.

**COT-FIX-03 — Método de pago real al confirmar**
Nuevo tipo `QuoteConfirmPaymentMethod` y constante `QUOTE_CONFIRM_PAYMENT_METHODS = ["Efectivo","Tarjeta","Transferencia","Credito"]` en `quote-validation.ts`, validados por `validateQuoteConfirmPaymentMethod`. `confirmQuote(quoteId, tenantId, paymentMethod)` recibe el método desde la ruta; solo crea `CashMovement` para métodos no-crédito, y crea una `Debt` para Crédito (rechaza con `QuoteValidationError` si la cotización no tiene cliente asociado). Frontend: `src/app/ui/quotes-list.tsx` — el modal de confirmación pasó de un `paymentType` fijo en `"CASH"` a un selector real de 4 botones (Efectivo/Tarjeta/Transferencia/Crédito) que viaja como `paymentMethod` en el body del POST.

**COT-FIX-04 — customerId propagado a la venta**
`confirmQuote`: la venta se crea con `customerId: quote.customerId` en vez de `null`.

**COT-FIX-06 — Vendedor en Quote → Sale**
`prisma/schema.prisma`: `Quote.sellerId String?` y `Quote.sellerCode String?` (migración `20260902090000_add_quote_seller`, aplicada a Neon). `createQuote` y `duplicateQuote` reciben `sellerId` (resuelto server-side desde `requireRole().userId`, no confiado del cliente) y lo completan junto con `sellerCode` al crear/duplicar; `confirmQuote` copia ambos campos a la `Sale` generada. Rutas actualizadas para pasar `userId`: `POST /api/quotes`, `POST /api/quotes/[id]/duplicate`.

**COT-FIX-07 — Permisos en los GET**
`GET /api/quotes` y `GET /api/quotes/[id]` pasan de `requireTenantId()` a `requireRole(["OWNER","CASHIER"],"quotes")`, igual que el resto de las rutas del módulo.

**COT-FIX-08 — Auditoría**
`src/modules/audit/audit-data-access.ts`: `AuditAction` extendido con `"QUOTE_CREATED" | "QUOTE_CONFIRMED" | "QUOTE_CANCELLED"`. `logAudit(...)` agregado (fire-and-forget, después de que la operación de negocio resuelve) en `POST /api/quotes`, `POST /api/quotes/[id]/confirm` y `DELETE /api/quotes/[id]`.

**Tests:** `quote-data-access.integration.test.ts` reescrito — `beforeEach` crea un `User` real y abre una `CashRegisterSession` real; 5 casos nuevos (tope de descuento, propagación de `customerId`/`sellerId` + monto neto en `CashMovement`, `Debt` en vez de `CashMovement` para Crédito, rechazo de Crédito sin cliente, rechazo sin caja abierta). `quote-validation.test.ts` ampliado con `validateQuoteConfirmPaymentMethod`. `src/app/api/quotes/route.test.ts` y `.../[id]/confirm/route.test.ts` actualizados a los nuevos contratos (`requireRole`, `paymentMethod`, `logAudit` mockeado). Dos archivos de test nuevos, sin cobertura previa: `src/app/api/quotes/[id]/route.test.ts` (GET/DELETE, 7 tests) y `src/app/api/quotes/[id]/duplicate/route.test.ts` (4 tests).

**Validación:** `npm run lint && npm run typecheck && npm test` — limpio (443 passed / 2 skipped, 69 archivos). Migración `add_quote_seller` aplicada a Neon vía `npx prisma migrate deploy` (confirmado previo a correr los tests de integración, con aprobación explícita del usuario).
