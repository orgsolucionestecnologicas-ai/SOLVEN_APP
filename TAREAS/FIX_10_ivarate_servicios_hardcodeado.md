# FIX-10 — ivaRate de Servicios hardcodeado en 0.21 (nunca configurable)

## Contexto (verificado en código, no es un supuesto)

`Product` tiene un campo real `ivaRate Float @default(0.21)` (`prisma/schema.prisma:160`), configurable por producto vía UI (`products-inventory.tsx`, opciones 0% / 10.5% / 21% / 27%, `IVA_RATES` en `src/modules/products/product-validation.ts:15`).

`Service` **no tiene ningún campo `ivaRate`** (`prisma/schema.prisma:486-500`) — cualquier venta o presupuesto con un servicio factura ese ítem con IVA 21% fijo en el código, sin importar la alícuota real del servicio. Puntos exactos donde está hardcodeado:

- `src/modules/sales/sale-data-access.ts:389` (`buildServiceSaleItem`) — `ivaRate: 0.21`.
- `src/modules/quotes/quote-data-access.ts:97` (creación de presupuesto, ítem de servicio) — no captura ivaRate en absoluto; tampoco lo hace para productos (`quote-data-access.ts:84`, línea de producto) porque **`QuoteItem` tampoco tiene campo `ivaRate`** (`prisma/schema.prisma:616-628`).
- `src/modules/quotes/quote-data-access.ts:287` (conversión de presupuesto a venta) — `ivaRate: 0.21` fijo para TODOS los ítems del `SaleItem` creado, sean producto o servicio.
- `src/app/ui/pos.tsx:1220` (`addServiceToCart`) — `ivaRate: 0.21` fijo al agregar un servicio al carrito (compará con la línea 1190, que sí usa `product.ivaRate` con fallback a 0.21 solo si es `null`).

Esto es un bug de datos falsos ante ARCA: si algún servicio no está gravado al 21% (ej. exento, o 10.5%), la factura sale mal igual.

## Qué hacer

### 1. Migración de esquema (`prisma/schema.prisma`)
- Agregar a `model Service` (línea ~486-500): `ivaRate Float @default(0.21)` (mismo tipo/default que `Product.ivaRate`).
- Agregar a `model QuoteItem` (línea ~616-628): `ivaRate Float @default(0.21)`.
- Generar la migración con Prisma (`npx prisma migrate dev --name add_ivarate_service_quoteitem` o el flujo que ya usa el proyecto) y verificar que el SQL generado sea solo `ALTER TABLE ... ADD COLUMN ... DEFAULT 0.21` (no debe tocar datos existentes más que setear el default).

### 2. Validación de Servicios (`src/modules/services/service-validation.ts`)
- Importar `IVA_RATES` (y el tipo `IvaRate` si existe) desde `src/modules/products/product-validation.ts` — **no duplicar la lista**.
- Agregar `ivaRate?: number` a `CreateServiceInput`, `ValidatedServiceInput` y `UpdateServiceInput`.
- En `validateCreateServiceInput`: si `input.ivaRate !== undefined`, validar que esté en `IVA_RATES` (mismo mensaje de error que products: "ivaRate inválido. Valores aceptados: 0, 0.105, 0.21, 0.27"); si no viene, default a `0.21` (mismo comportamiento actual, ahora explícito y editable después).
- En `validateUpdateServiceInput`: mismo patrón que `product-validation.ts` para `ivaRate` en updates (opcional, solo valida si viene).
- `src/modules/services/service-data-access.ts` no necesita cambios — `createService`/`updateService` ya spread el objeto validado directo a Prisma.

### 3. UI de Servicios (`src/app/ui/services.tsx`)
- Agregar `ivaRate: number` (o `string`, según convenga al form) a `type ServiceRecord`.
- En el formulario de alta/edición de servicio (cerca de `svc-price`, línea ~445-465): agregar un `<select>` de alícuota con las mismas 4 opciones que usa `products-inventory.tsx` (0% Exento, 10.5%, 21% — Alícuota general, 27%), default 21% para altas nuevas. Incluir `ivaRate` en el payload del POST/PUT.

### 4. `src/modules/sales/sale-data-access.ts`
- Línea 389, `buildServiceSaleItem`: cambiar `ivaRate: 0.21` → `ivaRate: service.ivaRate`.

### 5. `src/modules/quotes/quote-data-access.ts`
- Línea ~84 (ítem de producto en creación de presupuesto): agregar `ivaRate: product.ivaRate` al objeto pusheado a `itemsData`.
- Línea ~97 (ítem de servicio en creación de presupuesto): agregar `ivaRate: service.ivaRate` al objeto pusheado a `itemsData`.
- El tipo inline `itemsData: Array<{...}>` (línea ~64-71) necesita el campo `ivaRate: number` agregado.
- Línea 287 (conversión de presupuesto a venta): cambiar `ivaRate: 0.21` → `ivaRate: item.ivaRate` (usando el valor ya guardado en el `QuoteItem` al crear el presupuesto, no recalculado).

### 6. `src/app/ui/pos.tsx`
- `type ServiceRecord` (línea 96-102): agregar `ivaRate: number`.
- Línea 1220, `addServiceToCart`: cambiar `ivaRate: 0.21` → `ivaRate: service.ivaRate != null ? Number(service.ivaRate) : 0.21` (mismo patrón defensivo que la línea 1190 para productos).

## Restricciones estrictas
- No tocar `src/lib/arca/*` (el voucher builder ya lee `ivaRate` genéricamente desde cada ítem, no hay que cambiar nada ahí).
- No inventar una migración de datos que reinterprete servicios/presupuestos ya existentes — el `@default(0.21)` preserva exactamente el comportamiento actual para filas viejas; el fix es que de ahora en más sea configurable.
- No tocar `src/modules/invoices/*` (ya recalcula desde `sale.items`, que ahora traerá el `ivaRate` correcto automáticamente una vez este fix esté).
- Reusar `IVA_RATES` de `product-validation.ts`, no crear una lista paralela.

## Archivos afectados (esperados)
- `prisma/schema.prisma` + nueva migración
- `src/modules/services/service-validation.ts`
- `src/app/ui/services.tsx`
- `src/modules/sales/sale-data-access.ts`
- `src/modules/quotes/quote-data-access.ts`
- `src/app/ui/pos.tsx`
- Tests: agregar/actualizar los que correspondan en `service-validation.test.ts` (si existe) y cualquier test existente de sales/quotes que asuma `ivaRate: 0.21` hardcodeado.

## Protocolo de reporte
1. `npm run typecheck` y `npm run lint` sin errores.
2. `npm test` sin regresiones (reportar cuántos passed).
3. Commit + `git push origin main`.
4. Agregar entrada a `TAREAS/REPORTE_DE_CAMBIOS.md` con el detalle técnico completo.
5. Agregar entrada corta (2-4 líneas) a `TAREAS/REPORTELIDER.md` (NO borrar el archivo, solo agregar al final).
6. Entregable breve en el chat.
