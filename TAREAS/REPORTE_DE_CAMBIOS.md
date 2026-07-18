# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

TESTS-01 — 2026-07-18. Orden: `TAREAS/TESTS_01_cobertura_quotes_reports_users_subscription_webhooks.md`. Objetivo: cobertura base (camino feliz + errores principales) para los 5 módulos sin tests listados en `CLAUDE.md` sección 11. Solo se agregaron archivos de test nuevos — ningún archivo de producción fue modificado. Commit: `b7cd735`.

**quotes** (`src/modules/quotes/quote-validation.test.ts`, `src/app/api/quotes/route.test.ts`, `src/app/api/quotes/[id]/confirm/route.test.ts` — 20 tests): validación de creación de presupuesto (items, cliente, email, producto/servicio exclusivo, cantidad), GET/POST de `/api/quotes` (401/403/400 con `reasons`/201), POST `/api/quotes/[id]/confirm` (403/401/404/409×2/200). Sin hallazgos — el comportamiento coincide con lo esperado.

**reports** (`src/app/api/reports/export/route.test.ts`, `src/app/api/reports/export-pdf/route.test.ts` — 8 tests): export CSV (`ventas`/`productos`, headers correctos, scoping por tenantId, tipo inválido → 400) y export PDF (mismo scoping, `renderToBuffer` mockeado). Sin hallazgos.

**users** (`src/modules/users/user-validation.test.ts`, `src/app/api/users/route.test.ts`, `src/app/api/users/[id]/route.test.ts` — 21 tests): validación de alta de usuario, GET/POST `/api/users` (solo OWNER puede crear — CASHIER explícitamente rechazado, verificado que `logAudit` no se llama en el 400 y sí en el 201), PATCH/DELETE `/api/users/[id]` (cambio de rol, activar/desactivar, guardas de auto-modificación, DELETE con ventas asociadas devuelve `deleted:false` sin `confirm=true`). Sin hallazgos.

**subscription** (`src/app/api/subscription/route.test.ts` — 5 tests): defaults TRIAL sin fila `Subscription`, cálculo de `daysLeft` (redondeo hacia arriba, 0 si venció), error 500 si falla la carga.
⚠️ **Hallazgo, no corregido** (regla explícita de la orden — solo agregar tests, no tocar lógica): `src/app/api/subscription/route.ts:7` llama a `requireTenantId()` **fuera de todo try/catch**. Sin sesión, la promesa de `GET()` rechaza con `UnauthorizedError` en lugar de resolver a una respuesta 401 — en producción esto lo más probable es que Next.js lo convierta en un 500 genérico en vez del 401 esperado. Verificado empíricamente con un test que confirma el `rejects.toBeInstanceOf(UnauthorizedError)`. El mismo patrón (mismo bug) existe en `src/app/api/dashboard/summary/route.ts:7`, fuera del alcance de esta orden pero relacionado. Todos los demás route handlers del proyecto envuelven `requireTenantId()`/`requireRole()` en try/catch correctamente — este es el único caso (además de `dashboard/summary`) que no lo hace.

**webhooks/rebill** (`src/app/api/webhooks/rebill/route.test.ts` — 11 tests): los 5 tipos de evento (`subscription.activated`/`created`, `payment.success`/`invoice.paid`, `payment.failed`/`invoice.payment_failed`, `subscription.cancelled`, `subscription.trial_will_end`) verificando el update correcto de `Subscription` y la llamada al email correspondiente; JSON inválido → 400; evento desconocido → 200 `{received:true}` sin tocar la base; y un test que documenta el comportamiento actual de la firma (con `REBILL_WEBHOOK_SECRET` seteado vía `vi.stubEnv`, firma inválida → 401). No se tocó la lógica del endpoint — el bypass de firma sin `REBILL_WEBHOOK_SECRET` ya está documentado en `CLAUDE.md` sección 5 y Diego decidió postergarlo.

**Validación:** `npm run typecheck` limpio, `npm run lint` limpio, `npm test` → 323 tests pasando + 2 skipped (sin regresiones, sin flakes esta corrida).

---

FIX-11 revisado y verificado por el Ingeniero Líder — 2026-07-18. Diff confirmado contra la orden: endpoint reescrito para verificar sesión con `getSession()`, comparar `currentPassword` contra el hash real del usuario (`verifyPassword`, no la env var `SOLVEN_PASSWORD`), y persistir `newPassword` hasheada vía `prisma.user.update`. Test nuevo con 4 casos (401 sin sesión, 400 password corta, 401 password actual incorrecta, éxito con persistencia verificada). Typecheck limpio (reverificado en esta revisión). Orden archivada. Resumen completo en `TAREAS/REPORTELIDER.md`.

---
