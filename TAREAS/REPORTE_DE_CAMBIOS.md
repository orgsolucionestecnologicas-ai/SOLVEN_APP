# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## 2026-09-02 — PROD-UX-01: "Nuevo producto" — costo opcional, sin margen, SKU inteligente por categoría, código de barras real

Orden: `TAREAS/PROD-UX-01_nuevo-producto.md`. Rama: `design/revision-uiux-sep-2026`. Commit: `150996b` (push confirmado a `origin/design/revision-uiux-sep-2026`).

### Sección 1 — `costPrice` opcional
- `prisma/schema.prisma`: `Product.costPrice` pasa de `Decimal @db.Decimal(12,2)` a `Decimal? @db.Decimal(12,2)`. Migración `product_cost_price_optional` aplicada y verificada contra Neon.
- `src/app/ui/product-form.tsx`: sacado `required` del campo "Precio de compra", sacada la validación de obligatoriedad, `handleSubmit` omite la clave si el campo está vacío en vez de mandar `NaN`.
- `src/modules/products/product-validation.ts`: `costPrice` acepta `undefined`/`null`.
- `src/modules/products/product-data-access.ts`: `updateProduct` ajustado para no explotar en runtime cuando `existing.costPrice` o `product.costPrice` son `null`.
- Auditoría de los ~14 archivos con referencias a `costPrice` (sales, reports export/export-pdf, products API, sales-list, reports UI, product-edit-view, inventory-adjust-form, inventory-entry-form, onboarding-wizard, products-inventory, InventoryTab, dashboard) para que ningún cálculo de margen/ganancia agregada trate un `costPrice` nulo como `0` — productos sin costo cargado se excluyen del cálculo puntual en vez de contarse con costo cero.

### Sección 2 — Sacar "Margen de ganancia %"
`product-form.tsx`: sacado el `<FormField>` de margen completo, el estado `margin`, `handleMarginChange` y la parte del cálculo bidireccional costo↔margen↔venta que sincronizaba `margin` (se conserva `handleCostPriceChange`/`handleSalePriceChange` para lo que sigue vigente). "Precio de venta" e "Alícuota de IVA" quedan igual, ya no dependen del margen. Sacado el texto de ayuda que mencionaba el cálculo automático por margen.

### Sección 3 — Proveedor
Confirmado que ya era opcional (`validate()` no lo exigía) — sin cambios, según indicaba la propia orden.

### Sección 4 — Código de barras real + SKU automático por categoría
- `prisma/schema.prisma`: `Product.barcode String?` nuevo, `@@unique([tenantId, barcode])`. Migración `product_barcode` aplicada y verificada contra Neon.
- `product-form.tsx`: el campo "Código de barras" (ya existía en el form) ahora sí viaja en el `payload` y se persiste vía `createProduct`/`updateProduct` y `product-validation.ts` — antes se capturaba y se descartaba en silencio.
- `src/app/ui/pos.tsx`: `ProductRecord` gana el campo `barcode`; el efecto de "código exacto → agregar al carrito" matchea contra `productCode` **o** `barcode`; sumado también al filtro de búsqueda por texto.
- SKU manual eliminado (input + botón "Auto" + `generateSku(name)` sacados de `product-form.tsx`). Reemplazado por generación automática server-side: prefijo de categoría (3 letras: ALI/BEB/LAC/LIM/CPE/HOG/PAN/SNA, `OTR` como fallback) + secuencial de 4 dígitos, por tenant (no global).
- Modelo nuevo `ProductSkuCounter` (`{ id, tenantId, tenant, categoryPrefix, lastVal }`, `@@unique([tenantId, categoryPrefix])`). Migración `product_sku_counter` aplicada y verificada contra Neon.
- Función nueva `generateProductSku(tenantId, categoryName)`, con el mismo patrón transaccional (upsert + increment dentro de `$transaction`) que el `generateCode()` existente — deliberadamente **no** reutiliza `generateCode()`/`CodeCounter` (ese contador es global y lo comparten otros dominios; la orden pedía explícitamente no tocarlo). `createProduct` ahora llama a la función nueva en vez de `generateCode("PROD")`. El código se asigna una sola vez al crear el producto y no se regenera si la categoría cambia después.

### Sección 5 — Sacar panel "Resumen del producto"
`product-form.tsx`: sacado el Panel 3 completo (costo/margen/venta/ganancia por unidad), incluyendo el aviso de "pérdida o margen cero" (`isLossOrZeroMargin`) — ya no aplica con costo opcional y margen fuera del formulario. Sacada también la referencia suelta a `SKU: {sku || "--"}` del panel de cabecera (el SKU manual ya no existe).

### Sección 6 — Bug menor: `subcategoryName` no se guardaba
`handleSubmit` ahora incluye `subcategoryName` en el `payload` (columna real `Product.subcategoryId` ya existía, simplemente no se estaba mandando).

### Validación
`npm run lint`: PASS. `npm run typecheck`: PASS. `npm test`: 461 passed / 4 failed / 2 skipped (467 total).

Los 4 tests que fallan son los 4 de `src/modules/inventory/stock-adjustment.integration.test.ts` — **no relacionados con esta orden**. Causa raíz identificada por lectura directa del código: `void logAudit({...})` sin `await` en `src/modules/inventory/stock-adjustment.ts:74` genera una carrera entre la escritura del audit log y el `deleteMany` de limpieza del siguiente test. Los productos de ese archivo se crean con `prisma.product.create()` directo, sin pasar por `createProduct()`/la lógica de SKU tocada en esta orden. No se corrigió porque `src/modules/inventory/*` está explícitamente prohibido en el alcance de esta orden, sin excepción (a diferencia de `src/modules/sales/*`, que sí tenía una excepción acotada a las necesidades de `costPrice` opcional). Queda para que alguien autorizado a tocar ese módulo lo revise.

Fix necesario y sí aplicado, consecuencia directa del modelo `ProductSkuCounter` nuevo: 6 tests de integración (`product-data-access.integration.test.ts`, `returns/index.integration.test.ts`, `core-business-flow.integration.test.ts`, `dashboard-summary.integration.test.ts`, `api/dashboard/summary/route.integration.test.ts`, `api/products/route.integration.test.ts`) fallaban con `ProductSkuCounter_tenantId_fkey` porque sus funciones de limpieza borraban el `Tenant` de prueba sin borrar antes la fila de `ProductSkuCounter` que ahora se crea en cada `createProduct()` — no existía este modelo antes de esta orden. Se agregó `prisma.productSkuCounter.deleteMany(...)` a la limpieza de cada uno de los 6 archivos, siguiendo el patrón de resolución de `tenantId` que ya usaba cada archivo. Verificado con dos corridas completas de la suite (antes/después): la primera corrida tenía 7 archivos fallando (16 tests), la segunda solo 1 (los 4 de `stock-adjustment`, preexistente y fuera de alcance).

### Migraciones (3, todas confirmadas aplicadas contra Neon con `npx prisma migrate status` → "Database schema is up to date!")
1. `product_cost_price_optional`
2. `product_barcode`
3. `product_sku_counter`

### Pendiente anotado, no implementado (por instrucción explícita de la orden)
"Marca" (`brand`) se captura en el formulario pero no tiene columna en `Product` — anotado en `PENDIENTES.md` (`T21`) como pregunta de producto para Diego, sin implementar.
