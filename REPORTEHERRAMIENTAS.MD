# REPORTE — Módulo de Cotizaciones / Presupuestos

**Fecha:** 2026-06-09
**Commit:** add320e feat: add quotes/budgets module with reservation tracking and email reminders

---

## Archivos creados (13)

| Archivo | Descripción |
|---|---|
| `prisma/migrations/20260609192643_add_quotes_module/migration.sql` | Migración: QuoteStatus enum, Quote, QuoteItem |
| `src/modules/quotes/quote-validation.ts` | Tipos, validaciones, errores tipados |
| `src/modules/quotes/quote-data-access.ts` | 8 funciones de data access con transacciones atómicas |
| `src/modules/quotes/index.ts` | Exports del módulo |
| `src/app/api/quotes/route.ts` | GET (lista) + POST (crear) |
| `src/app/api/quotes/[id]/route.ts` | GET (detalle) + DELETE (cancelar) |
| `src/app/api/quotes/[id]/confirm/route.ts` | POST confirmar → venta |
| `src/app/api/quotes/[id]/send-reminder/route.ts` | POST enviar email |
| `src/app/api/quotes/expiring/route.ts` | GET próximos a vencer |
| `src/app/api/quotes/reserved-stock/route.ts` | GET stock reservado por producto |
| `src/app/api/cron/expire-quotes/route.ts` | GET cron expiration (protegido por CRON_SECRET) |
| `src/app/quotes/page.tsx` | Page server component |
| `src/app/ui/quotes-list.tsx` | UI completa: tabla, filtros, modales |

## Archivos modificados (4)

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | QuoteStatus enum, Quote model, QuoteItem model, relaciones en Tenant y Customer |
| `src/lib/generate-code.ts` | Agregado "COT" al type CodePrefix |
| `src/lib/email.ts` | Agregadas sendQuoteEmail y sendQuoteExpiringReminderEmail |
| `src/app/ui/app-shell.tsx` | "quotes" a ActiveSection, navItem Cotizaciones con FileText icon |

---

## Decisiones técnicas

- **Stock no se descuenta** al crear cotización: solo se lee `salePrice` para calcular totales. El descuento ocurre en `confirmQuote` dentro de transacción atómica.
- **Stock reservado es informativo**: calculado sumando QuoteItems de cotizaciones activas (DRAFT/SENT no expiradas). No bloquea ventas.
- **Expiración dual**: cron `/api/cron/expire-quotes` + fallback on-read en `listQuotes` y `getQuoteById`.
- **`confirmQuote`**: reutiliza exactamente el mismo patrón atómico de `createSale` (SELECT FOR UPDATE, reducción de stock, InventoryMovement, CashMovement/Debt).
- **Numeración**: usa `generateCode("COT")` → COT-0001, COT-0002, igual que CLI/SRV/PROD.
- **validUntil**: calculado automáticamente como `now() + 5 días`.

---

## Problemas encontrados y resueltos

- **TS5076**: Mezclando `??` y `||` sin paréntesis — corregido con `(a ?? b) || c`.
- **Variable redundante** en `createQuote`: doble llamada a `customer.findUnique` — eliminada.

---

## Estado de validación

- `npm run lint`: ✅ sin errores
- `npm run typecheck`: ✅ sin errores
- `npx prisma validate`: ✅ schema válido
- `npm test`: ✅ 182 tests, 37 archivos, todos pasan

---

## Pendientes / mejoras sugeridas

- Tests unitarios para `quote-validation.ts` y de integración para `quote-data-access.ts`
- Stock reservado visible en la tabla de Productos (`/products`)
- `sendQuoteExpiringReminderEmail` no tiene un endpoint que la llame automáticamente — requiere integración con el cron o un endpoint dedicado
- `paymentType` en `confirmQuote` podría ser configurable desde el modal (ya implementado en UI pero el backend acepta el parámetro)
