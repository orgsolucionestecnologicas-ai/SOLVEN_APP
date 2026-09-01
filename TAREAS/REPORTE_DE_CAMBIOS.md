# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### 2026-09-01 — INV-FIX-01..10: Inventario — aislamiento por tenant, stock atómico, borrado seguro, alertas y avisos

Ejecutados los 10 bugs confirmados por INGENIERODETESTEO en `TAREAS/ordenestest.md`, sección "Inventario — auditado 01-09-2026".

**INV-FIX-01 (CRÍTICO) — `adjustProductStock` ignoraba `tenantId`**
`src/modules/inventory/stock-adjustment.ts`: la lectura y la escritura del producto ahora filtran por `{ id, tenantId }`. Antes cualquier tenant podía ajustar (y ver) el stock de un producto de otro tenant conociendo su `id`.

**INV-FIX-02 (ALTO) — ajuste de stock no era atómico, podía perder cambios concurrentes**
Misma función: el `update({ data: { stock: newStock } })` (SET absoluto) se reemplazó por un UPDATE condicional en SQL crudo dentro de la transacción — `WHERE id = $id AND tenantId = $tenantId AND stock = $previousStockLeídoEnLaMismaTx`. Si no devuelve fila (alguien más cambió el stock entre la lectura y la escritura), se lanza `StockAdjustmentConcurrentConflictError` (409 en la ruta) en vez de pisar el dato en silencio. Mismo patrón que `reduceProductStock`.

**INV-FIX-03 (MEDIO) — ajuste manual sin registro de auditoría**
Se agregó `void logAudit({ tenantId, userId, action: "INVENTORY_ADJUSTED", ... })` al final de `adjustProductStock`. Se reutilizó la acción `INVENTORY_ADJUSTED` ya existente en el union type `AuditAction` en vez de agregar `STOCK_ADJUSTED` (que sugería la orden) — evita ensanchar el tipo con un valor semánticamente redundante. Requirió agregar `userId` como parámetro de la función (ya disponible en la ruta vía `requireRole`).

**INV-FIX-04 (ALTO) — borrar un producto usaba solo `requireTenantId()`**
`src/app/api/products/[id]/route.ts`, handler `DELETE`: pasa a `requireRole(["OWNER", "INVENTORY"], "products")`, igual que `PUT`. Antes cualquier usuario autenticado (ej. un CASHIER) podía borrar productos.

**INV-FIX-05 (ALTO) — sin validación antes de borrar, dejaba `SaleItem` huérfano o fallaba con error crudo de Postgres**
Mismo handler: antes de `prisma.product.delete`, se chequea si existe algún `SaleItem` o `InventoryMovement` para ese producto. Si hay ventas registradas o movimientos de stock, se devuelve 400 con mensaje en español sugiriendo desactivar el producto (`active: false`) en vez de borrarlo — antes, borrar un producto con ventas nulificaba silenciosamente `SaleItem.productId`, y borrar uno con movimientos de inventario fallaba con un error genérico de restricción de Postgres sin explicación.

**INV-FIX-06 (MEDIO-ALTO) — `Product.productCode` único global en vez de por tenant**
`prisma/schema.prisma`: `productCode` deja de tener `@unique` a nivel de campo y pasa a `@@unique([tenantId, productCode])`. Migración `20260901160000_product_code_tenant_unique` (DROP del índice único global, CREATE del índice único compuesto) — segura por construcción: la restricción vieja era estrictamente más fuerte que la nueva, así que ningún dato existente puede violarla. Aplicada a Neon con confirmación explícita de Diego. Antes, dos tenants distintos no podían usar el mismo código de producto (típico en importación CSV), con un error `P2002` opaco.

**INV-FIX-07 (MEDIO) — alta de producto con stock inicial no generaba `InventoryMovement`**
`src/modules/products/product-data-access.ts`, `createProduct`: envuelto en `$transaction`; si `stock > 0` al crear, se genera un `InventoryMovement` (`previousStock: 0`, `reason: "Stock inicial de alta de producto"`), igual que cualquier otro cambio de stock del sistema. Efecto colateral esperado: la limpieza de `src/app/api/products/route.integration.test.ts` ahora borra `InventoryMovement` antes de `Product` (evita violar la FK RESTRICT).

**INV-FIX-08 (BAJO-MEDIO) — historial de movimientos de stock visible para cualquier usuario autenticado**
`GET /api/inventory-movements`: pasa de `requireTenantId()` a `requireRole(["OWNER", "INVENTORY"], "products")`.

**INV-FIX-09 (BAJO) — alertas de stock bajo sin deduplicar, podían mandar decenas de emails/día**
Se eligió la opción de "mejor práctica" que ofrecía la orden (throttle) en vez del resumen diario por cron, porque ya era necesaria una migración en este mismo lote (INV-FIX-06) y el resumen por cron era una feature bastante más grande (nueva ruta, registro en `vercel.json`, UX distinta) fuera del alcance de un fix. Nueva tabla `ProductLowStockAlert` (`productId` único, `lastNotifiedAt`) — migración `20260901161000_add_product_low_stock_alert`, aplicada a Neon. `notifyLowStockIfEnabled` (`src/lib/email-alerts.ts`) filtra los productos ya notificados en las últimas 12hs antes de mandar el email, y hace `upsert` de `lastNotifiedAt` después de enviar.

**INV-FIX-10 (MEDIO) — sin aviso cuando el precio de venta queda por debajo del costo**
Nueva función pura `getSalePriceBelowCostWarning(costPrice, salePrice)` en `src/modules/products/product-validation.ts` — no se integró dentro de `validateCreateProductInput`/`validateUpdateProductInput` porque esos objetos se spreadean directo en los `create`/`update` de Prisma y no pueden llevar campos extra. Se llama por separado en las rutas `POST /api/products` y `PUT /api/products/[id]`, y el resultado se expone como campo `warning` opcional en la respuesta — `successResponse(data, status, warning?)` ahora acepta un tercer parámetro (siguiendo el mismo patrón que `pagination` en `paginatedResponse`), sin romper compatibilidad con las respuestas existentes.

**Migraciones aplicadas a Neon** (con confirmación explícita de Diego antes de `migrate deploy`): `20260901160000_product_code_tenant_unique`, `20260901161000_add_product_low_stock_alert`.

**Tests:** nuevos — `src/app/api/products/[id]/route.test.ts` (DELETE: 403/404/400×2/200), `src/app/api/inventory-movements/route.test.ts` (403/401/200), `src/lib/email-alerts.test.ts` (throttle: no-op, envío, salteo total, lote mixto), `src/modules/products/product-data-access.integration.test.ts` (InventoryMovement en alta, productCode por tenant). Reescrito — `src/modules/inventory/stock-adjustment.integration.test.ts`: el test de conflicto concurrente original pre-mutaba el stock *antes* de llamar a la función, lo cual no probaba nada (la relectura dentro de la transacción ya toma el valor nuevo, no hay conflicto real); se reemplazó por dos llamadas genuinamente concurrentes vía `Promise.allSettled`, donde la que pierde la carrera recibe `StockAdjustmentConcurrentConflictError` — comportamiento garantizado por Postgres bajo READ COMMITTED (la segunda transacción bloqueada reevalúa su `WHERE` contra el dato ya commiteado de la primera).

**Validación:** `npm run lint` y `npm run typecheck` limpios. `npm test`: 67 archivos, 414 passed, 2 skipped, 0 failed, en una corrida completa y limpia — dos corridas previas tuvieron entre 4 y 32 fallas intermitentes, todas con `PrismaClientInitializationError: Can't reach database server` contra Neon (nunca una aserción real), confirmadas como flakiness de conectividad reejecutando los archivos afectados de forma aislada (pasaron limpio) y luego la suite completa otra vez (limpia). Dos issues propias detectadas y corregidas antes del commit final: el mock del módulo `products` en `src/app/api/products/route.test.ts` no incluía `getSalePriceBelowCostWarning` (la ruta la llamaba como función real tras el mock, `undefined()` tiraba 500 en vez de 201); y el test de conflicto concurrente descrito arriba, que no ejercitaba una carrera real.

Commit: `a87c934`. No autocertificado como verificado — corresponde al Ingeniero Líder.
