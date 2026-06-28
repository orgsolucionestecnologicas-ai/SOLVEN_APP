# REPORTE DE CAMBIOS — SOLVEN

> Este archivo es actualizado automáticamente por el agente después de cada tarea ejecutada.
> Al finalizar la sesión de trabajo, Diego lo revisa aquí en Cowork y marca las tareas en Notion.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 002 — KPIs clickeables que navegan a su sección — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
Se agregó un prop opcional `href` a `MetricCard`: cuando está presente, la tarjeta se envuelve en un `<Link>` de Next.js (en lugar de un `<div>`) y se le agregan las clases `cursor-pointer transition hover:ring-2 hover:ring-violet-500/30`. Se aplicó a las 3 tarjetas de la grilla principal que usan `MetricCard`:
- "Ventas del día" → `/sales`
- "Ventas del mes" → `/sales`
- "Ganancia del día" → `/reports` (no hay una sección dedicada a "ganancia"; se eligió Reportes como destino más afín dado que es donde se analiza el desempeño financiero)

La tarjeta "Productos bajos" (stock crítico, que no usa `MetricCard` sino un `div` propio) se envolvió completa en un `<Link href="/inventory">` con el mismo estilo hover. El link interno "Ver inventario →" que apuntaba a `/products` se convirtió en un `<span>` (ya no es un link separado, para evitar anidar `<a>` dentro de `<a>`), y el destino de toda la tarjeta pasó a ser `/inventory` según el mapeo indicado en la tarea.

No se modificaron tamaño, color ni contenido de las tarjetas — solo se agregó el wrapping con Link y el estilo hover.

**Notas:**
- El mapeo de la tarea menciona 5 categorías (Ventas, Caja, Gastos, Deudas, Inventario), pero el dashboard actual solo tiene 4 tarjetas KPI en la grilla principal (no hay tarjetas de "Balance de caja", "Gastos del mes" ni "Deudas pendientes" en esa grilla); por eso solo se linkearon las 4 tarjetas existentes, sin agregar tarjetas nuevas (fuera de alcance de esta tarea).
- No se tocaron APIs, lógica de datos ni otros componentes — cambio acotado a `dashboard-summary.tsx`.
- `npm run build`, `npm run lint` y `npm test` (suite unitaria) ejecutados sin errores. Las mismas 32 fallas preexistentes de tests de integración por falta de `DATABASE_URL` en el sandbox persisten, sin relación con este cambio.

---

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
