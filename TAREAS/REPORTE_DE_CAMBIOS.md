# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

QA-FIX-03 revisado, incorporado a `TAREAS/QA_REPORTE.md` y archivado por el Ingeniero Líder — 2026-07-16. Ciclo de QA 1 prácticamente cerrado: único ítem abierto es una decisión de producto de 1 minuto (`CashRegisterIndicator`), no un fix de código.

---

## QA-FIX-04 — Ocultar CashRegisterIndicator para roles sin acceso a Caja — 2026-07-16

Único archivo tocado: `src/app/ui/app-shell.tsx`. `CashRegisterIndicator` ahora recibe `role`/`rolePermissions` como props (pasadas desde `AppShell`, que ya los obtenía de `/api/me` y `/api/role-permissions`). Regla de visibilidad: si `rolePermissions?.[`${role}:cashMovements`]` está definida, esa fila manda; si no, el default es `role === "OWNER" || role === "CASHIER"`; y si `role` todavía es `null` (carga inicial), tampoco se renderiza nada. Cuando el rol no puede ver Caja, el componente devuelve `null` antes de disparar los `fetch` a `/api/cash-register`/`/api/cash-movements` (ya no hay llamada que termine en 403 innecesario). `OWNER`/`CASHIER` mantienen el comportamiento exacto de antes.

No se creó test nuevo: no existe infraestructura de tests de componentes React en el proyecto (sin `testing-library`/`jsdom` en `package.json`/`vitest.config`, y no hay ningún `.test.tsx` bajo `src/app/ui/`), y el ítem no la pedía si no existía ya un archivo de test para este componente — verificado por lectura de código en cambio.

`npm run typecheck` y `npm run lint`: 0 errores. `npm test`: 227 passed / 1 failed / 2 skipped en la corrida completa — la única falla (`debt-payment-data-access.integration.test.ts > prevents concurrent payments from overpaying a debt`) es un test de concurrencia contra la base real (Neon) no relacionado con este cambio (no toca `app-shell.tsx` ni Caja); se re-corrió ese archivo solo y pasó limpio (4/4), confirmando que es flaky por timing, no una regresión. Commit: ver hash en `REPORTELIDER.md`.
