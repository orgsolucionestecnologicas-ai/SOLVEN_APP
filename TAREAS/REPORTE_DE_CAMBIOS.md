# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### TAREA QA-FIX-02 — ✅ Completada

**Qué se hizo:**
Se conectó `RolePermission` (hasta ahora sólo almacenado, sin efecto real) a la capa de autorización real. `requireRole(allowedRoles, section?)` en `src/lib/tenant.ts` ahora acepta un segundo parámetro opcional `section`. Reglas implementadas exactamente como las pidió Diego:
1. El array de roles hardcodeado sigue siendo el techo — se evalúa primero, sin cambios.
2. Si `role === "OWNER"`, la capa de `RolePermission` nunca se consulta — OWNER jamás puede ser bloqueado, ni con una fila `{OWNER, section, canAccess:false}` en la base.
3. Si el rol no es OWNER y se pasó `section`, se busca `{tenantId, role, section}` vía `listRolePermissions` (reutilizada de `src/modules/role-permissions/`, sin duplicar el query de Prisma). Si existe la fila y `canAccess === false` → `ForbiddenError` (403). Si no existe fila o `canAccess === true` → comportamiento idéntico al actual (permisivo por defecto).
4. `RolePermission` sólo puede angostar acceso por debajo del array hardcodeado, nunca ampliarlo.

**Mapeo endpoint → sección** (mismo criterio que `app-shell.tsx` usa para mostrar/ocultar ítems de navegación):

| Endpoint | Método | Roles (sin cambios) | Sección agregada |
|---|---|---|---|
| `/api/customers` | POST | OWNER, CASHIER, SUPERVISOR | `customers` |
| `/api/customers/[id]` | PUT, DELETE | OWNER, CASHIER, SUPERVISOR | `customers` |
| `/api/categories` | POST | OWNER, INVENTORY | `products` |
| `/api/categories/[id]` | DELETE | OWNER, INVENTORY | `products` |
| `/api/categories/[id]/subcategories` | POST | OWNER, INVENTORY | `products` |
| `/api/categories/[id]/subcategories/[subId]` | DELETE | OWNER, INVENTORY | `products` |
| `/api/services` | POST | OWNER, INVENTORY | `products` |
| `/api/services/[id]` | PUT, PATCH | OWNER, INVENTORY | `products` |
| `/api/products` | POST | OWNER, INVENTORY | `products` |
| `/api/products/[id]` | PUT | OWNER, INVENTORY | `products` |
| `/api/products/bulk` | PATCH | OWNER, INVENTORY | `products` |
| `/api/products/import` | POST | OWNER, INVENTORY | `products` |
| `/api/suppliers` | POST | OWNER, INVENTORY | `products` |
| `/api/inventory-adjustments` | POST | OWNER, INVENTORY | `products` |
| `/api/cash-movements` | POST | OWNER, CASHIER | `cashMovements` |
| `/api/cash-register` | POST | OWNER, CASHIER | `cashMovements` |
| `/api/cash-register/[id]` | PUT | OWNER, CASHIER | `cashMovements` |
| `/api/quotes` | POST | OWNER, CASHIER | `quotes` |
| `/api/quotes/[id]` | DELETE | OWNER, CASHIER | `quotes` |
| `/api/quotes/[id]/duplicate` | POST | OWNER, CASHIER | `quotes` |
| `/api/quotes/[id]/confirm` | POST | OWNER, CASHIER | `quotes` |
| `/api/quotes/[id]/send-reminder` | POST | OWNER, CASHIER | `quotes` |
| `/api/returns` | POST | OWNER, CASHIER | `returns` |
| `/api/sales` | POST | OWNER, CASHIER | `pos` |
| `/api/invoices` | POST | OWNER, CASHIER | `pos` |

27 endpoints cubiertos, 6 de las 10 secciones de `ROLE_PERMISSION_SECTIONS` (`dashboard` y `reports` no tienen endpoints de escritura propios; ver abajo por qué `promotions` y `settings` quedan sin efecto real).

**Deliberadamente sin tocar — endpoints OWNER-only (agregar `section` sería código muerto, porque la regla 2 hace que OWNER nunca sea bloqueado):**
`/api/promotions` (POST), `/api/promotions/[id]` (PUT, DELETE), `/api/promotions/[id]/duplicate` (POST), `/api/promotions/check-overlap` (POST), `/api/settings` (POST), `/api/users` (POST), `/api/users/[id]` (PUT, DELETE), `/api/tenants/arca-config` (POST), `/api/tenants/arca-config/cert` (POST), `/api/debts/[id]/write-off` (POST), `/api/export` (GET, sólo lectura), `/api/audit-logs` (GET, sólo lectura), `/api/invoices/test` (diagnóstico), `/api/expense-budgets` (POST). Consecuencia práctica: las secciones `promotions` y `settings` del panel de Permisos no tienen efecto real todavía, porque todos sus endpoints de escritura son exclusivos de OWNER.

**Pendiente de confirmar con Diego (ambigüedad real, no se adivinó):**
- `/api/debt-payments` (POST) — se llama tanto desde páginas de la sección `customers` (`customer-payment-form.tsx`, el modal de pago rápido en `customers-list.tsx`) como desde la página huérfana `/debts` (`debts-list.tsx`, sin ítem de navegación ni sección de `RolePermission`). Asignarle `"customers"` restringiría también el flujo de `/debts` sin que ese flujo esté gobernado por ningún permiso — se dejó sin `section` hasta que Diego defina si `/debts` debe mapearse a `customers` o necesita su propia sección.
- `/api/debts` (POST) — sólo alcanzable desde la página huérfana `/debts`, que no tiene ítem de navegación ni sección de `RolePermission` asignada. No se inventó una sección nueva (prohibido por la tarea).

**Fuera de alcance — "expenses" no es una sección de `RolePermission`:** `/api/expenses` (POST), `/api/recurring-expenses` (POST), `/api/expense-budgets` (POST, además OWNER-only).
**Fuera de alcance — página huérfana sin sección:** `/api/sales/[id]/send-email` (POST, sólo se llama desde `/sales`).

**Archivos modificados:**
- `src/lib/tenant.ts` — `requireRole` extendido con parámetro opcional `section`.
- 27 archivos de rutas API (ver tabla de mapeo arriba) — se agregó el segundo argumento `section` a la llamada `requireRole(...)` existente, sin tocar los arrays de roles.
- `src/lib/tenant.test.ts` — **nuevo**. 7 tests unitarios directos sobre `requireRole` (mockeando `next/headers`, `@/lib/auth` y `@/modules/role-permissions`, sin mockear `@/lib/tenant`): OWNER nunca bloqueado (con fila `canAccess:false` simulada), no-OWNER bloqueado con fila `canAccess:false`, permisivo sin fila, permisivo con `canAccess:true`, sin `section` no consulta `RolePermission`, rol fuera del array hardcodeado sigue rechazado sin consultar `RolePermission`, sin sesión → `UnauthorizedError`.
- `src/app/api/customers/route.role-permission.test.ts` — **nuevo**. 2 tests de integración a nivel de endpoint real (`POST /api/customers`, sin mockear `@/lib/tenant`): 403 para CASHIER con fila `canAccess:false` en sección `customers`, y 201 para OWNER pese a una fila `canAccess:false` simulada sobre OWNER/customers.

**Migraciones:** ninguna (el modelo `RolePermission` ya existía).

**Validación:**
- `npm run typecheck`: sin errores.
- `npm test` corrido dos veces completas: ambas veces **220 passed / 2 failed / 2 skipped (224 total)**. Las 2 fallas son iguales en ambas corridas y no relacionadas con este cambio:
  1. `sales/route.integration.test.ts > creates a credit sale with debt through the API flow` — falla preexistente ya aceptada (documentada desde QA-FIX-01).
  2. `debt-payment-data-access.integration.test.ts > prevents concurrent payments from overpaying a debt` — test de concurrencia contra la base real (`PrismaClientKnownRequestError` en vez de `DebtPaymentAmountError`), en un módulo (`src/modules/debts/`) que este cambio no tocó — confirmado con `git status`, no aparece en el diff. Parece ser un test flaky de timing/locking preexistente, no una regresión de QA-FIX-02.
- Sin regresiones nuevas atribuibles a este cambio.

**Algo pendiente:** las dos ambigüedades documentadas arriba (`/api/debt-payments` y `/api/debts`) requieren una decisión de producto de Diego sobre si `/debts` debe gobernarse por `customers`, tener su propia sección nueva, o quedar fuera del sistema de permisos.

---

### TAREA QA-FIX-01 — ✅ Completada

**Qué se hizo:**
Se agregó `requireRole([...])` a los 9 endpoints de escritura que sólo usaban `requireTenantId()` (sin chequeo de rol), permitiendo que cualquier rol autenticado — incluido READONLY — pudiera crear/editar/borrar datos. Cada endpoint replica exactamente el patrón (imports, try/catch, `ForbiddenError`/`UnauthorizedError`, `forbiddenResponse()`/`unauthorizedResponse()`) ya usado por un endpoint hermano del mismo recurso.

| Endpoint | Método | Roles permitidos |
|---|---|---|
| `/api/debts` | POST | OWNER, CASHIER, SUPERVISOR |
| `/api/customers/[id]` | PUT | OWNER, CASHIER, SUPERVISOR |
| `/api/customers/[id]` | DELETE | OWNER, CASHIER, SUPERVISOR |
| `/api/categories` | POST | OWNER, INVENTORY |
| `/api/categories/[id]` | DELETE | OWNER, INVENTORY |
| `/api/categories/[id]/subcategories` | POST | OWNER, INVENTORY |
| `/api/categories/[id]/subcategories/[subId]` | DELETE | OWNER, INVENTORY |
| `/api/services` | POST | OWNER, INVENTORY |
| `/api/recurring-expenses` | POST | OWNER, CASHIER |

**Archivos modificados:**
- `src/app/api/debts/route.ts`
- `src/app/api/customers/[id]/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/categories/[id]/route.ts`
- `src/app/api/categories/[id]/subcategories/route.ts`
- `src/app/api/categories/[id]/subcategories/[subId]/route.ts`
- `src/app/api/services/route.ts`
- `src/app/api/recurring-expenses/route.ts`
- `src/app/api/debts/route.test.ts` — mock actualizado (agrega `requireRole`) + test 403 nuevo
- `src/app/api/debts/route.integration.test.ts` — mock actualizado con `requireRole`
- `src/app/api/services/route.test.ts` — mock actualizado + test 403 nuevo
- `src/app/api/customers/[id]/route.test.ts` — **nuevo**, tests 403 para PUT y DELETE

**Migraciones:** ninguna.

**Validación:**
- `npm run typecheck`: sin errores.
- `npm test`: 212 passed / 1 failed (falla preexistente ya aceptada: `sales/route.integration.test.ts > creates a credit sale with debt through the API flow`, no relacionada) / 2 skipped. Sin regresiones nuevas.
- Prueba en vivo replicando el hallazgo de QA: se levantó el dev server, se minteó un token de sesión con rol `READONLY` (vía `createSession()`, usuario semilla `demo@solven.app` con rol forzado) y se hicieron requests reales contra los 9 endpoints. **Los 9 devolvieron 403** (antes del fix devolvían 200/201 con cualquier rol autenticado).

**Algo pendiente:** ninguno. Los 9 endpoints listados en QA_FIX_01 quedaron protegidos y verificados.

