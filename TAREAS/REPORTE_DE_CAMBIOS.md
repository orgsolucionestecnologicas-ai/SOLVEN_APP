# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

FIX-13 — 2026-07-22. Diff: (1) QA-01 `scripts/seed-icase.mjs` — `createProduct()` cambió de `prisma.product.create()` a `prisma.product.upsert({ where: { productCode: code }, update, create })`, porque `productCode` es `@unique` global y re-correr el seed contra una DB ya poblada tiraba `P2002`. `prodCount++` y el resto de la lógica intactos. (2) QA-02 `src/middleware.ts` — los 4 puntos de rechazo (token faltante, sesión inválida, suscripción `CANCELLED`/`EXPIRED`, `TRIAL` vencido) ahora devuelven JSON (`401` los dos primeros, `402` los dos de suscripción) cuando `pathname.startsWith("/api/")`, en vez del redirect a `/login` o `/suscripcion-vencida` que rompía cualquier cliente que esperara JSON de una API. El comportamiento para páginas (no-API) no cambió. `isPublic()` intacto. (3) QA-04 `src/app/api/cron/{expire-quotes,generate-recurring-expenses,remind-expiring-quotes}/route.ts` — el guard `if (cronSecret && authHeader !== ...)` dejaba pasar cualquier request sin auth si `CRON_SECRET` no estaba seteado en el entorno. Reemplazado por `if (process.env.NODE_ENV !== "development" || cronSecret) { if (authHeader !== \`Bearer ${cronSecret}\`) return errorResponse("Unauthorized", 401); }` en los 3 archivos — fuera de `development`, la ausencia de `CRON_SECRET` ahora rechaza en vez de permitir. No se tocó `vercel.json`. No había tests previos para `middleware.ts` ni para los 3 route de cron (regla de la orden: no hace falta agregarlos si no existían). `typecheck`/`lint`/`test` sin errores (323 passed, 2 skipped). Detalle de la orden en `TAREAS/FIX-13_seed_401json_cronsecret.md`.

---

FIX-12 revisado y verificado por el Ingeniero Líder — 2026-07-18. Diff confirmado: `requireTenantId()` ahora envuelto en try/catch en `subscription/route.ts` y `dashboard/summary/route.ts`, devolviendo 401 en vez de propagar la excepción. Test de `subscription` actualizado para esperar el 401. Typecheck limpio (reverificado). Orden archivada. Resumen completo en `TAREAS/REPORTELIDER.md`.

---
