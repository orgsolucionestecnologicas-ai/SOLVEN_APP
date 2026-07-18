# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

FIX-12 revisado y verificado por el Ingeniero Líder — 2026-07-18. Diff confirmado: `requireTenantId()` ahora envuelto en try/catch en `subscription/route.ts` y `dashboard/summary/route.ts`, devolviendo 401 en vez de propagar la excepción. Test de `subscription` actualizado para esperar el 401. Typecheck limpio (reverificado). Orden archivada. Resumen completo en `TAREAS/REPORTELIDER.md`.

---
