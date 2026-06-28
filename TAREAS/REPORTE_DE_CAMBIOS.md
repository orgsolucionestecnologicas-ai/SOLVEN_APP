# REPORTE DE CAMBIOS — SOLVEN

> Este archivo es actualizado automáticamente por el agente después de cada tarea ejecutada.
> Al finalizar la sesión de trabajo, Diego lo revisa aquí en Cowork y marca las tareas en Notion.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 001 — Filtro de fecha global en el Dashboard — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
Se agregó un selector de período (Hoy / Esta semana / Este mes / Personalizado) con botones tipo pill, ubicado antes de las tarjetas de KPIs. El botón activo usa el violeta `#7c3aed` (bg-violet-600) como exige la tarea. Para "Personalizado" se muestran dos inputs `type="date"` (desde/hasta) con el mismo estilo que el resto del archivo.

El filtro seleccionado se traduce a un rango `from`/`to` (helper `getDateRange`) y se pasa como query params a los fetch de `/api/sales` y `/api/cash-movements`, que ya soportaban `gte`/`lte` sobre `saleDate`/`movementDate` respectivamente — no fue necesario modificar esas rutas ni los módulos de acceso a datos.

**Notas:**
- No se filtró "gastos" porque el dashboard no realiza un fetch propio a `/api/expenses`; el único dato de gastos (`totalExpensesAmount`) proviene de `/api/dashboard/summary`, que no usa fechas y no se muestra en la UI. Se decidió no tocar esa ruta ni `dashboard-summary.ts` (módulo) para no romper sus tests existentes y por respetar la restricción de no modificar archivos fuera del alcance indicado.
- Default del selector: "Este mes" (no "Hoy"), para evitar que las tarjetas y gráficos queden vacíos al cargar la página por primera vez.
- No se modificó el schema de Prisma ni el layout general del dashboard.
- `npm run build`, `npm run lint` y `npm test` (suite unitaria) ejecutados sin errores. Los tests de integración fallan en este entorno por falta de `DATABASE_URL` (no hay base de datos disponible en el sandbox) — falla preexistente, no relacionada con este cambio.

---
