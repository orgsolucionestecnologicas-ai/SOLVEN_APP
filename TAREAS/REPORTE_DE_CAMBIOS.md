# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

QA-FIX-06 verificado por el Ingeniero Líder (diff de 11 líneas en debt-payment-data-access.ts, exactamente lo pedido, integridad de datos confirmada en las 10 corridas) — 2026-07-17. `QA_REPORTE.md` releído completo y archivado: los 10 hallazgos del ciclo de QA 1 están resueltos, único punto restante es la feature de gastos recurrentes (fuera de alcance). Resumen dejado en `TAREAS/REPORTELIDER.md`.

---

UI-01 (reorganización de UI pedida por Diego, no un bug) — 2026-07-17. Se movió "Devoluciones" del menú principal a una pestaña dentro de Ventas, en los 4 archivos esperados:
- `src/app/ui/app-shell.tsx`: se eliminó el ítem `{ href: "/returns", label: "Devoluciones", ... }` de `navItems` (y el import ahora no usado de `RotateCcw`). El valor `"returns"` se dejó intacto en el tipo `NavSection`, sigue siendo válido para `RolePermission`.
- `src/app/returns/page.tsx`: eliminado (confirmado por grep que ningún otro archivo enlazaba a `/returns`).
- `src/app/ui/returns.tsx`: se quitó el header de página completa (breadcrumb "Operaciones / Devoluciones" + `<h1>Devoluciones</h1>`) y se cambió el contenedor externo de `flex min-h-screen flex-col bg-slate-50` a `flex flex-col bg-slate-50` (sin asumir alto de página completa, mismo criterio que `SalesList`). Se mantuvo intacta la barra interna de sub-pestañas "Nueva devolución" / "Historial" (solo se le quitó el `mt-4` que sobraba al quedar como primer elemento del bloque, sin el `<h1>` arriba). El resto del componente no se tocó.
- `src/app/ui/pos.tsx`: se importó `Returns` desde `./returns`; `ActiveTab`/`TABS` ahora incluyen `"Devoluciones"`. Se agregaron `role`/`rolePermissions` a `Pos()` con el mismo patrón de `fetch("/api/me")` + `fetch("/api/role-permissions")` que ya usa `AppShell` (líneas ~416-438 de `app-shell.tsx`). Se agregó `visibleTabs` con la misma fórmula que `visibleNavItems`: por defecto visible (el ítem no tenía `hiddenForRoles`), pero si `rolePermissions?.[`${role}:returns`]` está definido, ese valor manda; la barra de pestañas ahora mapea `visibleTabs` en vez de `TABS` directamente. El switch de contenido quedó de tres vías: `"Historial"` → `<SalesList />`, `"Devoluciones"` → `<Returns />`, resto → UI completa del POS.

**Visibilidad por rol**: se verificó por lectura de código que la fórmula es idéntica byte a byte a la que ya usa `app-shell.tsx` para el resto del nav (`configured !== undefined ? configured : true`, ya que el ítem de Devoluciones nunca tuvo `hiddenForRoles`) — mismo comportamiento que tenía el ítem de nav, ni más restrictivo ni más permisivo. No hay infraestructura de tests de componentes React en el proyecto, así que no se agregó test automatizado para esto; se verificó manualmente por inspección del JSX y la lógica, no en navegador.

**Validación**: `npm run typecheck` falló primero por un artefacto stale de Next.js (`'.next/types/validator.ts` seguía referenciando la ruta `returns/page.tsx` recién borrada) — se limpió `.next/types` (carpeta de build, gitignorada, se regenera sola) y volvió a pasar limpio. `npm run lint` sin errores. `npm test`: 228 passed / 0 failed / 2 skipped (230) — sin regresiones, y la falla de concurrencia de `debt-payment-data-access` (documentada en QA-FIX-04/05, corregida en QA-FIX-06) tampoco apareció en esta corrida completa.

**Restricciones respetadas**: no se tocaron `/api/returns/*`, `role-permissions-table.tsx` ni el comportamiento de `GET /api/returns`; `Returns` vive en un solo lugar (la pestaña), sin ruta duplicada.
