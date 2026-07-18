# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

FIX-12 — 2026-07-18. Orden: `TAREAS/FIX_12_requiretenantid_sin_trycatch.md`. Hallazgo de TESTS-01: `src/app/api/subscription/route.ts:7` y `src/app/api/dashboard/summary/route.ts:7` llamaban `requireTenantId()` fuera de todo try/catch, así que sin sesión válida el `UnauthorizedError` se propagaba sin capturar en vez de resolver al 401 que devuelve el resto de los endpoints del proyecto (en producción, Next.js probablemente lo convertía en un 500 genérico).

Se envolvió la llamada en ambos archivos con el patrón estándar del proyecto:
```ts
let tenantId: string;
try {
  tenantId = await requireTenantId();
} catch (e) {
  if (e instanceof UnauthorizedError) return unauthorizedResponse();
  throw e;
}
```
`src/app/api/subscription/route.ts` — importa `UnauthorizedError` de `@/lib/tenant` y `unauthorizedResponse` de `../_shared/responses`. `src/app/api/dashboard/summary/route.ts` — mismo patrón, `unauthorizedResponse` desde `../../_shared/responses`. El resto de la lógica de cada `GET` (cálculo de `daysLeft`, `getDashboardSummary`) no se tocó.

Se actualizó el test existente `src/app/api/subscription/route.test.ts`: el caso que antes esperaba `rejects.toBeInstanceOf(UnauthorizedError)` ahora espera `response.status === 401`, igual que el resto de los tests 401 del proyecto. `src/app/api/dashboard/summary/route.test.ts` no ejercita el camino sin sesión (siempre mockea `requireTenantId` resuelto) — revisado, no necesitó ajuste porque no tenía ninguna aserción sobre ese comportamiento; no se agregó un test nuevo para ese caso porque está fuera del alcance de esta orden.

**Validación:** `npm run typecheck` limpio, `npm run lint` limpio, `npm test` → 323 tests pasando + 2 skipped (sin regresiones). Commit: `a8ee593`.

---

TESTS-01 revisado y verificado por el Ingeniero Líder — 2026-07-18. Diff confirmado: 10 archivos, todos `*.test.ts`, ningún archivo de producción modificado. Typecheck limpio (reverificado). El hallazgo reportado (`subscription/route.ts:7` y `dashboard/summary/route.ts:7` llaman `requireTenantId()` fuera de try/catch — 401 esperado puede terminar como 500 sin sesión) se confirmó leyendo ambos archivos directamente. Queda anotado en `CLAUDE.md` y en `PENDIENTES.md` para decidir cuándo corregirlo. Orden archivada. Resumen completo en `TAREAS/REPORTELIDER.md`.

---
