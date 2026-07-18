# PENDIENTES — SOLVEN

> Backlog vivo de cosas por decidir o hacer que no son una orden ejecutable todavía (o que están a la espera de una confirmación de Diego). A diferencia de `REPORTELIDER.md` (historial de lo ya hecho) y las órdenes de `TAREAS/*.md` (trabajo activo para el agente), este archivo es para anotar pendientes sueltos a medida que aparecen, para no perderlos. Se va a ir migrando acá lo que antes vivía en Notion.
>
> Formato: cada ítem con fecha en que se anotó, contexto breve, y qué haría falta para poder cerrarlo o convertirlo en una orden.

---

## Abiertos

(vacío por ahora)

---

## Cerrados

### 2026-07-18 — Borrar `SOLVEN_PASSWORD` / `SOLVEN_USER` de Vercel (CERRADO)
Confirmado por dos vías independientes que ninguna se usaba: grep en el código (sin referencias en `src/` desde FIX-11) y revisión en Vercel vía agente de Chrome (BROWSER-01, sin uso detectable en Build Logs). Borradas de Production y Preview por el agente de Chrome — Vercel confirmó "Removed Environment Variable successfully". Falta un próximo deploy normal para que el cambio tome efecto (no se forzó redeploy).

### 2026-07-18 — `requireTenantId()` sin try/catch en subscription y dashboard/summary (CERRADO)
Hallazgo de TESTS-01. Resuelto en FIX-12 (commit `a8ee593`): ambos endpoints ahora envuelven `requireTenantId()` en try/catch y devuelven 401 en vez de propagar la excepción. Verificado por el Ingeniero Líder contra el diff, typecheck limpio. Ver `CLAUDE.md` sección 5.
