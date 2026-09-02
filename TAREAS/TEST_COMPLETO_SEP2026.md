# TEST COMPLETO — Regresión de entorno SOLVEN (Sep 2026)

> Informe de verificación integral (sin cambios de código) al cierre del ciclo de revisión de diseño UI/UX + auditoría INGENIERODETESTEO de agosto/septiembre 2026.
> Autor: Ingeniero Líder (Claude Cowork). Fecha: 2026-09-03. Rama base: `main`. Último commit auditado: `455b1ed`.
> **Regla aplicada:** nada se da por "verificado" sin leerlo contra el código real; los reportes previos se usaron como mapa, no como prueba.

---

## 0. Resumen ejecutivo (leer esto primero)

La app está **estable y en condiciones de seguir en producción**. Los 9 ciclos de fixes de INGENIERODETESTEO (POS/RET/CAJA/INV/DEUDA/COT/REPORTE/PROMO/USER) y el ciclo de diseño (RET-UX-01, PROD-UX-01, CAJA-UX-01) **no regresionaron**: RBAC, scope por `tenantId`, clamps de dinero, concurrencia de devoluciones/caja/factura y el motor de promociones "solo la mejor oferta" están todos intactos y verificados línea por línea.

**Un (1) hallazgo nuevo real, no detectado en ciclos previos**, rompe la regla no negociable de aislamiento por tenant en el camino más usado de la app (crear una venta):

- **`SALE-TENANT-SCOPE` (severidad Alta / Crítico por rúbrica del proyecto):** `createSale` busca los productos/servicios del carrito **sin filtrar por `tenantId`**, y el descuento de stock es un `UPDATE` crudo **sin `tenantId`**. Un usuario autenticado del tenant A que conozca el `id` de un producto del tenant B puede leer su precio y **descontar stock del tenant B**. Es la misma clase de bug que `INV-FIX-01` (que el equipo clasificó como el más crítico de su ciclo), pero en el camino de venta, que nunca se auditó para este punto específico.

**¿Hay que frenar producción HOY? No.** El bug **no** es explotable en masa: requiere un `id` de producto ajeno (CUID de 25 caracteres, no adivinable ni enumerable), no hay evidencia de explotación, el daño se limita al contador de stock de un tenant víctima (corregible) y no hay pérdida de dinero para nadie. Pero **debe ser el ítem #1 de la próxima orden de código**, porque viola literalmente la regla "TODOS los queries Prisma con `tenantId` scope — sin excepción".

Además: 1 hallazgo cosmético (LOW) y 1 nota de defensa-en-profundidad. Detalle abajo.

**Limitación de alcance de este ciclo:** la suite automatizada (`typecheck`/`lint`/`test`) **no se pudo correr a término en el sandbox de Cowork** (detalle en §2). El último verde conocido (**463 passed / 2 skipped**) es el reportado por el agente de VS Code en su entorno real y **no fue reproducido de forma independiente acá**. No hubo verificación visual en el entorno desplegado (Vercel) — queda como pendiente manual de Diego (T18/T8/T19), no como "verificado".

---

## 1. Alcance

Todos los módulos, sin excepción: POS (venta actual), Caja (apertura/cierre/movimientos), Inventario, Devoluciones, Deudas, Cotizaciones, Reportes (incl. exportación PDF/CSV), ARCA (facturación fiscal), Promociones, Usuarios/Permisos (RBAC de 5 roles). Verificación estática contra el código real: 80 `route.ts`, 22 módulos de `src/modules/`, `src/middleware.ts`, `src/lib/auth.ts`/`tenant.ts`, `prisma/schema.prisma`.

## 2. Metodología y limitación de entorno

**Lo que sí se hizo:**
- Clon aislado del repo en `/tmp/solven_audit` (rsync sin `node_modules`/`.next`/`.git`) — **no se tocó el working directory compartido**.
- Barrido de guardas de autenticación por endpoint y por método HTTP (GET/POST/PUT/PATCH/DELETE).
- Barrido de todos los `findUnique`/`findFirst`/`update`/`delete`/`findMany` de `src/modules` y `src/app/api` buscando accesos por `id` sin scope de tenant.
- Verificación de invariantes de los fixes recientes (FIX-08 ARCA, FIX-13 middleware/cron, FIX-14 `saleNet`, PROMO-FIX-02 motor, reserva-antes-de-AFIP, clamps de descuento, concurrencia de devoluciones/caja).

**Lo que no se pudo hacer (limitación real del sandbox, no del código):**
- `npm run typecheck`: `tsc --noEmit` **excede el límite de 45s por comando** del entorno (proyecto grande + filesystem montado lento). Se intentó dos veces (caché en frío y en caliente), ambas cortaron por timeout **sin emitir errores** — no es un fallo de tipos, es que no llega a terminar.
- `npm test` (Vitest): **`Bus error`** al ejecutar los binarios nativos de `rollup` mapeados en memoria sobre el `node_modules` montado desde Windows. Un `npm install` limpio en el FS nativo de Linux daría binarios correctos, pero **no cabe en el límite de 45s por comando** y los procesos en background **no sobreviven** entre llamadas (namespace de PID aislado con `--die-with-parent`).
- **Conclusión de esta parte:** confirmo la limitación ya documentada en `CLAUDE.md` §11–12, ampliada: en este entorno **no** es posible correr la suite a término. El conteo 463/2 sigue siendo el del agente ejecutor, sin reproducción independiente en este pase.
- **Flaky conocido (`TEST-FLAKY-STOCK-ADJ`):** confirmado por lectura de código que **sigue vigente y sin corregir** — `src/modules/inventory/stock-adjustment.ts:74` mantiene `void logAudit(...)` sin `await`. Sigue siendo el único fallo no determinístico conocido y su causa raíz no cambió.

---

## 3. Resultado por módulo

| Módulo | Estado | Evidencia |
|--------|--------|-----------|
| **Auth / Middleware** | ✅ OK | `/api/*` devuelve JSON 401/402 (no redirect) — `middleware.ts:91,100,109,117`. `getHmacKey` obligatorio, `verifySession` sin fail-open a OWNER (USER-FIX intacto). |
| **Usuarios / Permisos (RBAC)** | ✅ OK | Los 80 endpoints revisados: toda escritura con `requireRole`; los GET usan `requireTenantId` (lectura scopeada). `requireRole` revalida contra DB con TTL 2min. |
| **POS / Ventas** | ⚠️ 1 hallazgo Alto | Clamps de dinero correctos (`sale-data-access.ts:209,216,219,242,555` — descuento nunca supera el total, sin total negativo, rechaza sobrepago). **PERO** fetch de productos/servicios sin `tenantId` → ver `SALE-TENANT-SCOPE` (§4). |
| **Caja** | ✅ OK | `closeSession` valida `{id, tenantId}` antes del `updateMany` (`cash-register-data-access.ts:97`). `computePaymentMethodBreakdown` (CAJA-UX-01) intacto. Índice único parcial anti doble-apertura presente. |
| **Inventario** | ✅ OK (+flaky de test) | `adjustProductStock` con scope de tenant + optimistic locking (INV-FIX-01). `DELETE /api/products/[id]` con rol + bloqueo por ventas/movimientos. Flaky de test sigue (§2). |
| **Devoluciones** | ✅ OK | Transacción `Serializable` + `ReturnConcurrentConflictError` (`returns/index.ts:396,33`). Guarda de sobre-devolución (`:289`). `refundReference`/`refundMethod` + regla tarjeta→tarjeta (RET-UX-01) intactos. |
| **Deudas** | ✅ OK | `registerDebtPayment`/`writeOffDebt` scopeados por tenant (DEUDA-FIX-01/02). GET con rol. |
| **Cotizaciones** | ✅ OK | `createQuote` valida `customerId` y productos por `tenantId` (`:45,58`). `confirmQuote` exige caja abierta, monto neto, método real, copia cliente/vendedor. Nota defensa-en-profundidad en §4. |
| **Reportes / PDF / CSV** | ✅ OK | `saleNet` sin recursión (FIX-14, `reports.tsx:37`). Export con rol OWNER + `-03:00` explícito. Helper `src/lib/csv.ts` con BOM en los 10 puntos. |
| **ARCA / Facturación** | ✅ OK | `emitInvoice` carga la venta por `{id, tenantId}` y recalcula desde DB (FIX-08, `:47`). Reserva-antes-de-AFIP + reintento `10016` presentes (`:99+`). `getInvoiceBySaleId` con tenant. Bypass de firma Rebill sigue diferido a propósito (conocido). |
| **Promociones** | ✅ OK | Motor "solo gana la mejor oferta" (`promotion-engine.ts:419,425,429` — `greaterThan` estricto, empate al primero). `customerSegment` cableado en ambos call sites (`sale-data-access.ts:184`, `apply/route.ts:65`). |

---

## 4. Hallazgos nuevos

### 🔴 `SALE-TENANT-SCOPE` — `createSale` no filtra productos por tenant y descuenta stock ajeno · Severidad: Alta (Crítico por la rúbrica del proyecto)

**Evidencia:**
- `src/modules/sales/sale-data-access.ts:133-134` — dentro de la transacción de `createSale`:
  ```ts
  transaction.product.findMany({ where: { id: { in: productIds } } }),   // sin tenantId
  transaction.service.findMany({ where: { id: { in: serviceIds } } })    // sin tenantId
  ```
- `src/modules/sales/sale-data-access.ts:592-597` — `reduceProductStock`, UPDATE crudo:
  ```sql
  UPDATE "Product" SET "stock" = "stock" - ${quantity} WHERE "id" = ${product.id} AND "stock" >= ${quantity}
  ```
  también **sin `tenantId`**.
- No hay ninguna validación previa de pertenencia al tenant: `validateCreateSaleInput` (`:108`) es validación de formato pura, no toca la DB.

**Impacto:** un usuario autenticado (OWNER/CASHIER) del tenant A que incluya en el carrito un `productId`/`serviceId` del tenant B: (a) lee el precio/nombre/`ivaRate` del producto ajeno; (b) crea un `SaleItem` en su propio tenant referenciando el producto ajeno; (c) **descuenta el stock del tenant B**. Rompe la regla no negociable "TODOS los queries Prisma con `tenantId` scope".

**Contraste que lo confirma como omisión, no como decisión:** el camino análogo `createQuote` **sí** scopea por tenant (`quote-data-access.ts:58`: `findMany({ where: { id: { in: productIds }, tenantId } })`), e `INV-FIX-01` ya arregló exactamente esta clase en `adjustProductStock`. El camino de venta quedó sin este tratamiento — POS-FIX-01..04 se enfocó en descuentos y en el rol del GET, no en el scope del fetch de productos.

**Por qué NO es una emergencia de frenar-producción-hoy:** requiere conocer un `id` ajeno (CUID de 25 caracteres, no enumerable ni adivinable); no hay evidencia de explotación; el daño se limita al contador de stock de un tenant víctima (dato corregible), sin pérdida de dinero. Riesgo real acotado, pero la garantía de aislamiento está formalmente violada.

**Fix propuesto (próxima orden, no en este pase):** agregar `tenantId` al `findMany` de productos y servicios (`:133-134`), agregar `AND "tenantId" = ${tenantId}` al UPDATE de `reduceProductStock` (`:595`), y un test de integración de aislamiento (venta del tenant A con producto del tenant B → `SaleProductNotFoundError`, stock del B intacto). Cambio chico y acotado, patrón ya existente en `createQuote`/`INV-FIX-01`.

### 🟢 `INV-ADJ-IVA-FIJO` — Preview de impuesto en alta de inventario hardcodeado a 21% · Severidad: Baja (cosmético)

`src/app/ui/inventory-adjust-form.tsx:247` — `const impuestos = costoTotal * 0.21;` (mostrado como "Impuesto (IVA 21%)", `:731`). Es un **preview informativo** del valor del stock que se está cargando; no persiste ni afecta ninguna venta/factura. Pero ignora el `ivaRate` real por producto (puede ser 0 / 10.5 / 27%). Sin riesgo financiero. Anotado por prolijidad y consistencia con la regla "IVA siempre por producto".

### ℹ️ Nota de defensa-en-profundidad (no es un bug hoy) — `confirmQuote` descuenta stock con UPDATE sin `tenantId`

`src/modules/quotes/quote-data-access.ts` (UPDATE crudo dentro de `confirmQuote`, `WHERE "id" = productId AND "stock" >= qty`, sin `tenantId`). Hoy es **seguro por construcción**: los ítems de una cotización sólo pueden ser productos del propio tenant, validados al crearla (`:58`). Igual conviene agregar el `tenantId` al UPDATE cuando se toque `SALE-TENANT-SCOPE`, por consistencia y para no depender de esa invariante implícita.

---

## 5. Entradas nuevas en PENDIENTES.md

Se agregan (este pase es solo verificación, no se corrige código):
- `SALE-TENANT-SCOPE` (🔴 Crítico) — el hallazgo de §4, con evidencia y fix propuesto.
- `INV-ADJ-IVA-FIJO` (🟡 Medio/cosmético) — preview de IVA fijo en alta de inventario.
- Nota de `confirmQuote` (defensa-en-profundidad) agrupada junto a `SALE-TENANT-SCOPE`.

Los pendientes pre-existentes verificables por código siguen vigentes tal como estaban (Rebill diferido, `ARCA-NC-01`, `RET-DEV-METODO`, `USER-RATELIMIT`, `TEST-FLAKY-STOCK-ADJ`, etc.). Ninguno cambió de estado en este pase.

---

## 6. Conclusión

**La app está en condiciones de seguir en producción sin cambios urgentes que obliguen a frenar hoy.** Todo lo que se endureció en agosto/septiembre se mantiene sólido y verificado contra el código real; no encontré ninguna regresión.

Hay **un único hallazgo nuevo que importa** — `SALE-TENANT-SCOPE` — que rompe formalmente la regla de aislamiento por tenant en el alta de venta. **No requiere freeze de producción** (no explotable sin un `id` ajeno, sin pérdida de dinero, daño acotado y corregible), pero **debe ser lo primero que se ordene en el próximo ciclo de código**, con su test de aislamiento correspondiente.

Pendientes que dependen de Diego, no del código y no bloqueantes para operar: correr la suite `npm test` en el entorno real para confirmar el 463/2 (no reproducible en este sandbox) y los smoke tests manuales en producción ya anotados (T18/T8/T19).
