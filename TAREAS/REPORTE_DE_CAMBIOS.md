# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### 2026-09-01 — DEUDA-FIX-01..06 (Deudas / Clientes)

Ejecutados los 6 bugs confirmados por INGENIERODETESTEO en `ordenestest.md`, sección "Deudas / Clientes — auditado 01-09-2026".

**DEUDA-FIX-01 — `registerDebtPayment` sin aislamiento de tenant.** `src/modules/debts/debt-payment-data-access.ts`: la lectura de la deuda pasó de `findFirstOrThrow({ id })` (implícito, sin tenant) a `findFirstOrThrow({ where: { id, tenantId } })`, y el `updateMany` de descuento de saldo ahora también filtra por `tenantId` además del guard existente `remainingAmount: { gte: paymentAmount }`. Antes, un tenant que conociera el `id` de una deuda ajena podía registrarle un pago (y afectar su `remainingAmount` y generar un `CashMovement` en la caja del tenant atacante). Cubierto con un nuevo test de integración: `registerDebtPayment` contra el `tenantId` de otro tenant ahora rechaza y el `remainingAmount` de la deuda original queda intacto.

**DEUDA-FIX-02 — `writeOffDebt` no zeroeaba el saldo.** `src/modules/debts/debt-data-access.ts`: al marcar `writtenOff: true` ahora también setea `remainingAmount: new Prisma.Decimal(0)`. Antes el write-off marcaba la deuda como "condonada" pero dejaba el `remainingAmount` original, lo que inflaba cualquier reporte o suma de saldo pendiente que no filtrara explícitamente por `writtenOff`. Nuevo test de integración verifica `remainingAmount === "0"` tras el write-off.

**DEUDA-FIX-03 — Sin auditoría en operaciones de deuda.** Agregado `logAudit` (patrón fire-and-forget existente, `void logAudit(...)` a nivel route, después de que la operación de negocio ya resolvió) en tres rutas: `POST /api/debts` (`DEBT_CREATED`), `POST /api/debt-payments` (`DEBT_PAYMENT_REGISTERED`), `POST /api/debts/[id]/write-off` (`DEBT_WRITTEN_OFF`). `AuditAction` (union type en `src/modules/audit/audit-data-access.ts`) extendido con esos 3 valores. Tests unitarios de cada ruta mockean `@/modules/audit` y verifican el `logAudit` con los campos esperados.

**DEUDA-FIX-04 — `GET /api/debts`, `GET /api/debt-payments`, `GET /api/customers` solo exigían `requireTenantId()`.** Cualquier usuario autenticado del tenant (sin importar rol ni `RolePermission`) podía leer deudas, pagos y clientes. Las 3 rutas pasan a `requireRole([...], "customers")` (mismos roles que ya exigía el `POST` correspondiente: `OWNER`, `CASHIER`, `SUPERVISOR`), con manejo de `ForbiddenError`/`UnauthorizedError` igual al resto de la app. Nuevo test 403 en cada uno de los 3 archivos de test.

**DEUDA-FIX-05 — Sin aviso de límite de crédito.** El modelo `Customer` no tiene (ni se pidió agregar) un campo de límite de crédito real — el hallazgo era de UX/claridad, no de dato faltante. Agregado aviso no bloqueante en `src/app/ui/customer-new-form.tsx` (alta de cliente: "Límite de crédito: Sin límite (requiere aprobación)") y en `src/app/ui/pos.tsx` (al vender a fiar, si el cliente seleccionado no tiene `creditLimit`, se muestra "Este cliente no tiene límite de crédito configurado."). Cambio puramente de UI, sin tocar `schema.prisma` para este ítem.

**DEUDA-FIX-06 — `Customer.customerCode` único global en vez de por tenant.** Mismo patrón ya aplicado a `Product.productCode` en INV-FIX (ver entrada anterior). `prisma/schema.prisma`: `customerCode String? @unique` → `customerCode String?` + `@@unique([tenantId, customerCode])`. Migración `20260901170000_customer_code_tenant_unique` (`DROP INDEX Customer_customerCode_key` + `CREATE UNIQUE INDEX Customer_tenantId_customerCode_key`), aplicada a Neon vía `npx prisma migrate deploy` con confirmación explícita del usuario antes de ejecutar contra la base real.

**Hallazgo adicional durante validación (no estaba en `ordenestest.md`, corregido en el mismo ciclo):** al correr la suite completa, `src/app/api/debts/route.integration.test.ts` y `src/app/api/debt-payments/route.integration.test.ts` dejaron 4 rechazos no manejados (`PrismaClientKnownRequestError P2003` sobre `AuditLog_userId_fkey`). Causa: estos tests mockean `requireRole` devolviendo un `userId` inventado (`"integration-user-id"`), que no existía como fila real en `User` — inofensivo antes de DEUDA-FIX-03, pero ahora que las rutas llaman a `logAudit` de verdad (sin mock, es un test de integración), el insert real en `AuditLog` viola la foreign key. Corregido siguiendo el mismo patrón ya usado en `src/app/api/products/route.integration.test.ts`: cada test crea un `prisma.user.create(...)` real en el `beforeEach` y usa su `id` real en el mock de `requireRole`; la función de limpieza de cada archivo borra `auditLog` y `user` (scopeados por `tenantId`) antes de borrar el `tenant`.

**Validación:** `npm run lint` (exit 0), `npm run typecheck` (exit 0), `npm test` — 67 archivos (65 passed + 2 skipped), 421 tests (419 passed + 2 skipped), sin errores no manejados. Commit `83900e9` — `fix(debts): tenant isolation on debt payments, write-off zeroes balance, credit limit visibility` (18 archivos).

**No autocertificado como verificado.** Queda para el Ingeniero Líder revisar contra el diff real, según indica el propio checklist de la orden.
