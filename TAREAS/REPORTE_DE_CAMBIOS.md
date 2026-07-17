# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

FIX-07 (bug real reportado por Diego, no hallazgo de QA) — 2026-07-17. Toda devolución sobre una venta no-crédito generaba un `CashMovement` en Efectivo por el monto completo, sin importar cómo se había pagado realmente la venta — porque toda venta nueva se crea con `paymentType: "CASH"` incluso cuando el pago fue mixto (mitad tarjeta, mitad efectivo), y el desglose real vive en `Sale.paymentDetails` (JSON), no en `paymentType`. Se agregó un selector "¿Cómo se reintegra?" (Efectivo / Tarjeta / Transferencia / VentaWeb / Otro — mismos 5 valores que `PAYMENT_METHOD_CONFIG` de `pos.tsx`) al formulario de devolución, y el `CashMovement` sólo se crea cuando el reintegro elegido es "Efectivo".

- `prisma/schema.prisma`: se agregó `refundMethod String?` (nullable, sin enum nuevo) al modelo `Return`. Migración `20260717181000_add_return_refund_method` generada y aplicada contra la DB de desarrollo con `npx prisma migrate dev` (no se corrió `migrate deploy` contra producción). Registros existentes de `Return` quedan con `refundMethod: null`, sin backfill.
- `src/modules/returns/index.ts`: nuevo export `RETURN_REFUND_METHODS` (los 5 valores). `processReturn()` ahora recibe un 6° parámetro opcional `refundMethod?: string`. La condición para crear el `CashMovement` pasó de `sale.paymentType === "CASH"` a `refundMethod === "Efectivo"`. Se exige `refundMethod` (lanza `ReturnValidationError`) salvo que la venta sea `CREDIT`. La rama `CREDIT` (reduce la deuda) quedó intacta, sin pedir método de reintegro. `refundMethod` se guarda en el `Return` creado (`null` si la venta es `CREDIT`) y se agregó a `ReturnListRecord`/`ReturnDetailRecord` y sus mapeos en `listReturns()`/`getReturnById()`. Se subió el timeout de la transacción de `processReturn` de 5000ms (default de Prisma) a 15000ms: la transacción hace varios round-trips secuenciales a Neon (venta, items, stock, movimiento de inventario, caja, devolución) y bajo latencia real de red superaba el default — confirmado reproduciendo el error real (`Transaction already closed`) en los tests de integración antes del ajuste.
- `src/app/api/returns/route.ts`: valida `refundMethod` contra `RETURN_REFUND_METHODS` (400 si no es un valor conocido) y lo pasa a `processReturn`.
- `src/app/ui/returns.tsx`: se extendió el tipo `Sale` con `paymentDetails`; se muestra un resumen de solo lectura "Pagado con" (lee `paymentDetails`, con fallback a Efectivo/Crédito si no hay desglose); se agregó el selector de método de reintegro (visible sólo cuando la venta no es `CREDIT`); `canSubmit` ahora exige `refundMethod` en ventas no-crédito; el POST incluye `refundMethod`; `ReturnConfirmStep` muestra el método elegido en el resumen de confirmación.
- `src/app/ui/return-credit-note-pdf.tsx`: la nota de crédito impresa muestra el método de reintegro cuando existe.
- **`GET /api/sales` ya devolvía `paymentDetails` sin cambios de backend**: `listSales` (`sale-data-access.ts`) usa `include` (no `select`) sobre `Sale`, por lo que ya traía todos los campos escalares, incluido `paymentDetails`. No fue necesario tocar `sale-data-access.ts` ni la ruta de sales.

**Tests nuevos**: `src/modules/returns/index.integration.test.ts` (DB real) prueba que `refundMethod: "Efectivo"` crea el `CashMovement`, que `"Tarjeta"` no crea ninguno, que una venta `CREDIT` sigue funcionando sin pedir `refundMethod` y reduce la deuda igual que antes, y que falta `refundMethod` en una venta no-crédito lanza `ReturnValidationError`. `src/app/api/returns/route.test.ts` ganó 3 tests nuevos (pass-through de `refundMethod`, 400 por valor inválido, 400 cuando `processReturn` rechaza por falta de `refundMethod`) — 15/15 tests del archivo pasan.

**Validación**: `npm run typecheck` y `npm run lint` sin errores. `npm test`: 235 passed / 2 skipped (237), sin regresiones. Commit `c43a3ca`.

**Restricciones respetadas**: no se tocó `sale-validation.ts` ni la restricción de Tarea-138 (ventas nuevas siguen aceptando sólo `paymentType: "CASH"`); no se agregó enum nuevo en Prisma; no se corrió `migrate deploy` contra producción; la rama `CREDIT` de `processReturn` no se modificó.

---

QA-FIX-06 verificado por el Ingeniero Líder (diff de 11 líneas en debt-payment-data-access.ts, exactamente lo pedido, integridad de datos confirmada en las 10 corridas) — 2026-07-17. `QA_REPORTE.md` releído completo y archivado: los 10 hallazgos del ciclo de QA 1 están resueltos, único punto restante es la feature de gastos recurrentes (fuera de alcance). Resumen dejado en `TAREAS/REPORTELIDER.md`.

---

UI-01 (reorganización de UI pedida por Diego, no un bug) — 2026-07-17. Se movió "Devoluciones" del menú principal a una pestaña dentro de Ventas, en los 4 archivos esperados:
- `src/app/ui/app-shell.tsx`: se eliminó el ítem `{ href: "/returns", label: "Devoluciones", ... }` de `navItems` (y el import ahora no usado de `RotateCcw`). El valor `"returns"` se dejó intacto en el tipo `NavSection`, sigue siendo válido para `RolePermission`.
- `src/app/returns/page.tsx`: eliminado (confirmado por grep que ningún otro archivo enlazaba a `/returns`).
- `src/app/ui/returns.tsx`: se quitó el header de página completa (breadcrumb "Operaciones / Devoluciones" + `<h1>Devoluciones</h1>`) y se cambió el contenedor externo de `flex min-h-screen flex-col bg-slate-50` a `flex flex-col bg-slate-50` (sin asumir alto de página completa, mismo criterio que `SalesList`). Se mantuvo intacta la barra interna de sub-pestañas "Nueva devolución" / "Historial" (solo se le quitó el `mt-4` que sobraba al quedar como primer elemento del bloque, sin el `<h1>` arriba). El resto del componente no se tocó.
- `src/app/ui/pos.tsx`: se importó `Returns` desde `./returns`; `ActiveTab`/`TABS` ahora incluyen `"Devoluciones"`. Se agregaron `role`/`rolePermissions` a `Pos()` con el mismo patrón de `fetch("/api/me")` + `fetch("/api/role-permissions")` que ya usa `AppShell` (líneas ~416-438 de `app-shell.tsx`). Se agregó `visibleTabs` con la misma fórmula que `visibleNavItems`: por defecto visible (el ítem no tenía `hiddenForRoles`), pero si `rolePermissions?.[`${role}:returns`]` está definido, ese valor manda; la barra de pestañas ahora mapea `visibleTabs` en vez de `TABS` directamente. El switch de contenido quedó de tres vías: `"Historial"` → `<SalesList />`, `"Devoluciones"` → `<Returns />`, resto → UI completa del POS.

**Visibilidad por rol**: se verificó por lectura de código que la fórmula es idéntica byte a byte a la que ya usa `app-shell.tsx` para el resto del nav (`configured !== undefined ? configured : true`, ya que el ítem de Devoluciones nunca tuvo `hiddenForRoles`) — mismo comportamiento que tenía el ítem de nav, ni más restrictivo ni más permisivo. No hay infraestructura de tests de componentes React en el proyecto, así que no se agregó test automatizado para esto; se verificó manualmente por inspección del JSX y la lógica, no en navegador.

**Validación**: `npm run typecheck` falló primero por un artefacto stale de Next.js (`'.next/types/validator.ts` seguía referenciando la ruta `returns/page.tsx` recién borrada) — se limpió `.next/types` (carpeta de build, gitignorada, se regenera sola) y volvió a pasar limpio. `npm run lint` sin errores. `npm test`: 228 passed / 0 failed / 2 skipped (230) — sin regresiones, y la falla de concurrencia de `debt-payment-data-access` (documentada en QA-FIX-04/05, corregida en QA-FIX-06) tampoco apareció en esta corrida completa.

**Restricciones respetadas**: no se tocaron `/api/returns/*`, `role-permissions-table.tsx` ni el comportamiento de `GET /api/returns`; `Returns` vive en un solo lugar (la pestaña), sin ruta duplicada.
