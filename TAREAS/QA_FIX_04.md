# QA-FIX-04 — Ocultar CashRegisterIndicator para roles sin acceso a Caja

> Último ítem abierto del ciclo de QA 1 (ver `TAREAS/QA_REPORTE.md`, hallazgo "NUEVO — CashRegisterIndicator..."). Decisión de Diego: ocultar el indicador para los roles que ya no pueden leer `/api/cash-movements`, en vez de crear un endpoint nuevo de solo-saldo. Menos superficie, cero riesgo de mostrar un saldo falso.

## Contexto exacto (ya verificado en el código)

- `src/app/ui/app-shell.tsx`, función `CashRegisterIndicator()` (línea 359-403): hoy se renderiza sin ningún filtro de rol (línea ~490, `<CashRegisterIndicator />`), y llama a `GET /api/cash-register` y `GET /api/cash-movements` para calcular el saldo.
- Desde QA-FIX-03, `GET /api/cash-movements` exige `requireRole(["OWNER","CASHIER"], "cashMovements")`. Para `SUPERVISOR`/`INVENTORY`/`READONLY`, esa llamada devuelve `403`, y el componente cae silenciosamente al `openingAmount` (monto de apertura) en vez del saldo real — un número visiblemente incorrecto, no un crash.
- `AppShell` (línea 405-434) ya obtiene `role` (vía `/api/me`) y `rolePermissions` (vía `/api/role-permissions`, mapa `"{role}:{section}"→canAccess`) y ya los usa para decidir qué ítems de nav mostrar (`visibleNavItems`, línea 429-434) — esa misma lógica es la fuente de verdad a reutilizar, no inventar una nueva.

## Qué hacer

1. Pasarle `role` y `rolePermissions` como props a `CashRegisterIndicator` (hoy no recibe ninguna prop) desde donde se renderiza en `AppShell` (línea ~490).
2. Dentro de `CashRegisterIndicator`, calcular si el rol puede ver Caja con la misma regla que ya usa `visibleNavItems`: default `role === "OWNER" || role === "CASHIER"`, pero si `rolePermissions?.[`${role}:cashMovements`]` está definido, ese valor manda (igual que el fallback ya implementado en `visibleNavItems`, línea 431-433).
3. Si el rol no puede ver Caja, el componente debe devolver `null` — no renderizar nada, ni siquiera un placeholder. No hacer los `fetch` a `/api/cash-register`/`/api/cash-movements` en ese caso (evitar la llamada innecesaria que igual devolvería 403).
4. Si `role` todavía no cargó (`null`, como pasa brevemente al montar `AppShell`), no renderizar nada hasta tener el rol — no hay que asumir "sí puede ver" mientras se carga (mismo criterio conservador que ya usa `visibleNavItems` al filtrar, que retorna `true` solo para ítems que no son `"link"`, pero acá no hay ese caso — para `CashRegisterIndicator` la regla es explícita: sin rol confirmado, no mostrar nada).

## Restricciones estrictas

1. No tocar `GET /api/cash-movements` ni `GET /api/cash-register` — el fix es 100% de UI, el backend ya está bien (QA-FIX-03).
2. No crear ningún endpoint nuevo.
3. No cambiar el comportamiento para `OWNER`/`CASHIER` — deben seguir viendo el indicador exactamente igual que hoy.
4. Reusar el mismo criterio que `visibleNavItems` (línea 429-434), no duplicar la lógica de permisos con una implementación distinta.

## Archivos afectados

- `src/app/ui/app-shell.tsx` (único archivo esperado)

## Test

Agregar o actualizar un test de `app-shell` (si ya existe un archivo de test para este componente; si no existe, no hace falta crear uno nuevo desde cero solo para esto — priorizar verificación manual/lectura de código y dejarlo documentado si se omite) que confirme: `CashRegisterIndicator` no renderiza nada para `SUPERVISOR`, `INVENTORY`, `READONLY`, y sí renderiza para `OWNER`, `CASHIER`.

## Protocolo de reporte

1. `npm run typecheck` sin errores → `git add -A && git commit -m "QA-FIX-04: ocultar CashRegisterIndicator para roles sin acceso a Caja" && git push origin main`.
2. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md` un reporte breve: qué se cambió, resultado de typecheck/tests, hash del commit.
3. Agregar una entrada corta (2-4 líneas) arriba de todo en `TAREAS/REPORTELIDER.md` (formato `### 2026-07-16 — QA-FIX-04: [resumen]`) — **sin borrar las entradas existentes**, este archivo es un log acumulativo permanente.
4. Entregable en el chat: breve — archivo modificado, resultado de typecheck, hash del commit. Con esto se cierra por completo el ciclo de QA 1.
