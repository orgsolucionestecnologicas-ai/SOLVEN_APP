# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

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

