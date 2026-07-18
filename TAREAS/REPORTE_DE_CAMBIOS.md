# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

## FIX-10 — ivaRate de Servicios hardcodeado en 0.21 (nunca configurable) — 2026-07-18

**Bug corregido:** `Service` no tenía campo `ivaRate` — cualquier venta o presupuesto con un servicio facturaba ese ítem con IVA 21% fijo en el código, sin importar la alícuota real (exento, 10.5%, 27%, etc.). Bug documentado en `CLAUDE.md` sección 5.

**Migración de esquema** (`prisma/migrations/20260718155318_add_ivarate_service_quoteitem/`):
- `Service.ivaRate Float @default(0.21)` — mismo tipo/default que `Product.ivaRate`.
- `QuoteItem.ivaRate Float @default(0.21)` — `QuoteItem` tampoco tenía ivaRate, ni para productos ni servicios.
- SQL generado: solo 2 `ALTER TABLE ... ADD COLUMN ... DEFAULT 0.21`, sin tocar datos existentes. Aplicada contra la DB real (Neon) con `prisma migrate dev`.

**Validación** (`src/modules/services/service-validation.ts`):
- `IVA_RATES`/`IvaRate` importados de `product-validation.ts` (no se duplicó la lista).
- `CreateServiceInput`/`UpdateServiceInput` aceptan `ivaRate?: number`, validado contra los 4 valores permitidos (0, 0.105, 0.21, 0.27), mismo mensaje de error que products. Si no viene en creación, default explícito a 0.21 (mismo comportamiento de antes, ahora editable después).

**UI de Servicios** (`src/app/ui/services.tsx`): nuevo `<select>` de alícuota en el modal de alta/edición (mismas 4 opciones que `products-inventory.tsx`), incluido en el payload de POST/PUT. Las rutas API (`/api/services`, `/api/services/[id]`) ya pasaban el body completo a `createService`/`updateService` sin filtrar campos, así que no requirieron cambios.

**Cálculo real (ya no hardcodeado):**
- `src/modules/sales/sale-data-access.ts` (`buildServiceSaleItem`): `ivaRate: service.ivaRate` (antes `0.21` fijo).
- `src/modules/quotes/quote-data-access.ts`: `createQuote` ahora guarda `ivaRate` real de producto/servicio en cada `QuoteItem`; `confirmQuote` (presupuesto → venta) usa `item.ivaRate` ya guardado en el `QuoteItem` (antes `0.21` fijo para todos los ítems).
- `src/app/ui/pos.tsx`: `ServiceRecord` ahora trae `ivaRate`; `addServiceToCart` usa `service.ivaRate` con el mismo patrón defensivo (fallback a 0.21 solo si viene null) que ya usaba la línea de productos.

**No tocado** (restricciones del fix, cumplidas): `src/lib/arca/*` (el voucher builder ya lee `ivaRate` genéricamente por ítem), `src/modules/invoices/*` (recalcula desde `sale.items`, que ahora trae el `ivaRate` correcto automáticamente), sin migración de datos que reinterprete filas existentes (`@default(0.21)` preserva el comportamiento actual para servicios/presupuestos viejos).

**Tests:** `service-validation.test.ts` ampliado (3 tests nuevos: acepta ivaRate válido en creación, rechaza inválido, cobertura completa de `validateUpdateServiceInput` con ivaRate). No existían tests de sales/quotes que asumieran el `0.21` hardcodeado, así que no hubo que actualizar ninguno existente. `typecheck`/`lint`/`test` sin errores (254 passed, 2 skipped, 46 archivos).

---
