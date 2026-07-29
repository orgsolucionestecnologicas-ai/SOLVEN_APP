# FIX-14 — Descuento no se resta en caja/reportes + Ajustes abierto por defecto para roles no-Owner

> Origen: hallazgos Crítico #2 y #3 de `TAREAS/QA_REPORTE.md` (QA-CHROME-01, 29-07-2026). Verificados contra el código por el Ingeniero Líder antes de esta orden — no son sospechas, son bugs confirmados con archivo:línea.

## Bug 1 — Caja y reportes registran el monto SIN descuento en ventas con promoción

**Dónde está el bug:** `src/modules/sales/sale-data-access.ts` — `totalAmount` (línea ~130-133) se calcula como la suma bruta de `item.total`, sin restar `discountAmount` (que se guarda aparte, línea ~169-170). El `CashMovement` de la venta se crea con `amount: totalAmount` (línea ~225) — el bruto, no lo realmente cobrado.

**Consumidores del mismo dato bruto que también hay que corregir:**
- `src/app/ui/reports.tsx` (varios lugares, ej. líneas ~198-199, ~1316-1317, ~2997-3006) suma `sale.totalAmount` directo para calcular ventas totales / rendimiento.
- `src/app/ui/cash-register-close.tsx` (líneas ~171-179) hace lo mismo para el resumen de cierre de caja.

**Referencia de cómo SÍ está bien hecho en el proyecto:** `src/app/ui/quotes-list.tsx` (líneas ~533, ~995) calcula `finalTotal = totalAmount - discountAmount` antes de mostrar el monto. Ventas necesita el mismo ajuste.

**Qué hacer:**
1. En `sale-data-access.ts`, al crear el `CashMovement` de una venta, usar el monto neto (`totalAmount - discountAmount`), no el bruto. Ojo con `Prisma.Decimal` — usar `.minus()`, no resta nativa de JS.
2. Decidir (y documentar en el commit) si `Sale.totalAmount` en sí debe seguir siendo el bruto (con `discountAmount` aparte, como está ahora — probablemente lo correcto, ya que es el registro contable de "cuánto costaban los ítems antes del descuento") o si conviene agregar un campo/helper explícito `netAmount`. Lo mínimo indispensable: en cualquier lugar que hoy sume `sale.totalAmount` para representar "dinero que efectivamente entró a caja" (reportes, cierre de caja, cualquier otro que aparezca al grep), restar `discountAmount`.
3. Gregar `totalAmount\b` en `src/app/ui/reports.tsx` y `src/app/ui/cash-register-close.tsx` y revisar cada uso — no asumir que la lista de arriba es exhaustiva, son solo los puntos ya confirmados.
4. Test: una venta con descuento por promoción debe reflejar el monto neto en `CashMovement`, en el resumen de cierre de caja, y en reportes de ventas — los 3 tienen que coincidir entre sí y con lo realmente cobrado.

## Bug 2 — Roles no-Owner tienen acceso a "Ajustes" por defecto (debería estar restringido)

**Dónde está el bug:** `src/app/ui/role-permissions-table.tsx` (~línea 31-37) — `DEFAULT_HIDDEN` solo restringe `settings` (y `cashMovements`) por defecto para `SUPERVISOR`. `CASHIER`, `INVENTORY` y `READONLY` quedan con acceso completo a Ajustes salvo que alguien configure una restricción manual. El motivo de fondo es que `requireRole`/el chequeo de `RolePermission` (`src/lib/tenant.ts` ~línea 45-51) **falla abierto**: si no hay fila explícita para rol+sección, permite el acceso.

**Qué hacer (fix acotado, mismo patrón que QA-FIX-04 que ya restringió `cashMovements` para SUPERVISOR):**
1. Agregar `"settings"` a la lista de secciones ocultas por defecto para `CASHIER`, `INVENTORY` y `READONLY` en `DEFAULT_HIDDEN` (`role-permissions-table.tsx`).
2. **No tocar el comportamiento de fail-open de `requireRole` en sí** (`tenant.ts`) — es un cambio de mucho más alcance que afectaría todas las secciones para todos los tenants existentes, no solo Ajustes. Si en el futuro se decide que el sistema entero debería fallar cerrado por defecto, eso es una orden aparte con su propio análisis de impacto — no mezclar acá.
3. Confirmar también el estado de las rutas API bajo `/api/settings/*` — verificar si ya exigen `["OWNER"]` a nivel de código (el QA report menciona que `GET /api/settings` sí lo hace) de forma independiente de esta tabla, y que este fix de la tabla no rompa nada ahí.
4. Test: con un usuario `CASHIER`, `INVENTORY` o `READONLY` sin overrides configurados, la sección "Ajustes" no debe estar accesible ni visible en el sidebar, salvo que un OWNER la habilite explícitamente.

## Validación y cierre (igual que siempre)

`typecheck`/`lint`/`test` sin errores antes de commitear. Reportar en `TAREAS/REPORTE_DE_CAMBIOS.md` (sin frases de autoverificación) y hacer commit + push a GitHub al final.
