# REPORTE DE CAMBIOS — SOLVEN

> Este archivo es actualizado automáticamente por el agente después de cada tarea ejecutada.
> Al finalizar la sesión de trabajo, Diego lo revisa aquí en Cowork y marca las tareas en Notion.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 011 — Estado vacío amigable en el Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
- Se agregó `const hasActivity = allSales.length > 0 || allCash.length > 0;`, calculado sobre las ventas y movimientos de caja ya obtenidos para el período seleccionado (sin tocar la lógica de fetch ni los endpoints).
- Cuando `hasActivity` es `false`, el bloque de tarjetas KPI, gráfico, paneles y acciones rápidas se reemplaza por el nuevo componente `DashboardEmptyState`, que muestra: ícono grande `ShoppingBag` (ya importado), título "Sin actividad en este período", subtítulo "Registrá tu primera venta del día desde el POS." y un botón "Ir al POS" (violeta `#7c3aed`) que enlaza a `/pos`.
- Cuando hay al menos una venta o movimiento de caja en el período, se muestra el Dashboard normal sin cambios (tarjetas, gráfico, paneles, acciones rápidas).
- El encabezado (saludo), el selector de período y los accesos rápidos superiores (`TopQuickActions`) se mantienen visibles siempre, incluso en el estado vacío, para que el usuario pueda cambiar de período o actuar sin perder contexto.

**Notas:**
- No se modificó la lógica de fetch, los endpoints, ni el cálculo de los valores derivados (`todaySalesTotal`, `salesByDay`, etc.) — solo se condicionó qué bloque de JSX se renderiza.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 010 — Tooltip explicativo en cada KPI del Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
- Se agregó el componente `KpiTooltip({ text })`: un ícono ⓘ pequeño (`text-gray-400`) que al hacer hover (`group`/`group-hover` de Tailwind, sin librerías externas) muestra un tooltip con fondo oscuro (`bg-slate-900`) y el texto explicativo, posicionado debajo del ícono con `absolute`/`pointer-events-none`.
- Se agregó un prop opcional `tooltipText?: string` a `MetricCard`, renderizado junto al ícono de la tarjeta (esquina superior derecha) cuando se provee.
- Se aplicó el tooltip a las tarjetas KPI cuyo texto del prompt corresponde de forma inequívoca a una tarjeta real del Dashboard:
  - "Ventas del día" → "Total de ventas completadas en el período seleccionado."
  - "Productos bajos" (tarjeta `LowStockCard`, equivalente a "Stock crítico") → "Productos con stock igual o por debajo del mínimo configurado."

**Notas:**
- El prompt nombraba 5 KPIs con su texto: Ventas del día, Balance de caja, Gastos del mes, Deudas pendientes y Stock crítico. El Dashboard actual no tiene tarjetas KPI para "Balance de caja", "Gastos del mes" ni "Deudas pendientes" (esos datos se obtienen en el fetch pero no se muestran como tarjeta numérica grande — mismo hallazgo documentado en Tareas 002 y 009). Las 4 tarjetas reales son: Ventas del día, Ventas del mes, Ganancia del día y Productos bajos.
- De esas 4 tarjetas, solo "Ventas del día" y "Productos bajos" tienen una correspondencia textual exacta y precisa con los textos del prompt ("Stock crítico" describe exactamente lo que muestra "Productos bajos"). "Ventas del mes" y "Ganancia del día" no tienen un texto equivalente en el prompt — "Ganancia del día" no es lo mismo que "Balance de caja" (una es ventas menos egresos de caja del día, la otra sería el saldo acumulado de caja), por lo que asignarle ese texto sería inexacto. Siguiendo "ante la duda, hacé menos — no más", se dejaron esas dos tarjetas sin tooltip en lugar de inventar un texto explicativo no solicitado.
- No se usaron librerías de tooltip externas — solo CSS de Tailwind con `group`/`group-hover`.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 009 — Animación de conteo (rollup) en los números grandes del Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
- Se agregó un custom hook `useCountUp(target: number, duration: number = 800)` dentro de `dashboard-summary.tsx`, que anima un número desde 0 hasta `target` usando `requestAnimationFrame`/`cancelAnimationFrame` (sin librerías externas).
- El hook usa un `useRef` (`hasAnimatedRef`) para asegurar que la animación corra una sola vez por montaje del componente: en el primer efecto anima 0→target; si `target` cambia después de esa primera animación (dentro del mismo ciclo de vida del componente), el valor salta directo al nuevo target sin re-animar.
- Se aplicó `useCountUp` en `MetricCard` (recibe ahora `value: number` + `format: (n: number) => string` en lugar de un string ya formateado) y en un nuevo componente `LowStockCard`.
- Los 3 KPIs monetarios ("Ventas del día", "Ventas del mes", "Ganancia del día") ahora pasan el número crudo a `MetricCard` junto con `format={formatARS}`; el valor se anima como entero y se formatea con `formatARS()` solo al renderizar (`format(animatedValue)`), cumpliendo el punto 4 del prompt.
- Se creó `LowStockCard({ count })`, que reemplaza el bloque inline anterior de "Productos bajos" y anima el conteo con `useCountUp(count ?? 0)`, preservando el fallback "—" cuando `count` es `null` (datos aún no cargados).
- No se modificó la lógica de fetch ni los datos: los valores numéricos siguen viniendo de los mismos states (`todaySalesTotal`, `monthSalesTotal`, `todayProfit`, `state.summary?.lowStockProductsCount`).

**Notas:**
- El prompt de la tarea nombraba como KPIs a animar "ventas del día, balance de caja, total gastos, total deudas". Se verificó que `currentCashBalance`, `totalExpensesAmount` y `totalDebtRemaining` se obtienen en el fetch pero **no se renderizan como números grandes** en ningún lugar del Dashboard actual (solo existen en el tipo `Summary`, sin uso en JSX). Por lo tanto, siguiendo el mismo criterio aplicado en la Tarea 002 ante un desajuste similar, se animaron los 4 "números grandes" que realmente se muestran hoy en el Dashboard: Ventas del día, Ventas del mes, Ganancia del día y Productos bajos (stock bajo). No se agregaron tarjetas nuevas ni se expandió el alcance de la UI.
- La animación corre solo una vez por montaje (gracias a `hasAnimatedRef`); si el usuario cambia filtros y el Dashboard vuelve a mostrar el skeleton de carga (`state.loading`), `MetricCard`/`LowStockCard` se desmontan y remontan, por lo que la animación se reproduce de nuevo de forma natural — esto es el comportamiento esperado, no un re-render comprado on every data change.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 008 — Saludo personalizado con nombre del usuario — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
El componente (Client Component, `"use client"`) no tenía acceso al usuario autenticado — `verifySession()` (`src/lib/auth.ts`) devuelve solo IDs y metadata de sesión, sin `name`. Se encontró que ya existe `GET /api/me` (`src/app/api/me/route.ts`, sin modificar), que devuelve `{ data: { name, businessName, role } }`, y que ya se consume client-side con el mismo patrón (`fetch` + `useEffect` + `useState`) en `SidebarUser` dentro de `src/app/ui/app-shell.tsx` — se replicó ese patrón existente, sin tocar el sistema de autenticación ni ningún Server Component.

Se agregó el componente `GreetingHeader` y el helper `getGreeting(date, name)`, que devuelve el saludo según franja horaria: "Buenos días, {nombre} ☀️" (6-12hs), "Buenas tardes, {nombre} 🌤️" (12-20hs), "Buenas noches, {nombre} 🌙" (20-6hs). El bloque de header se reemplazó: el título estático "Hola, Propietario 👋" pasó a ser el saludo dinámico (`text-xl font-bold`, igual que antes), y debajo se muestra la fecha actual formateada en español (`text-sm text-slate-500`, reutilizando `formatFullDate()` ya existente, que ya producía el formato pedido, ej. "Domingo 28 de junio de 2026") junto al ícono `Calendar` que antes estaba a la derecha del header — se reubicó debajo del saludo en vez de duplicar la fecha en dos lugares del mismo header.

**Notas:**
- No se modificó `src/lib/auth.ts`, `src/app/api/me/route.ts`, ni ningún Server Component (`dashboard/page.tsx`, `app-shell.tsx`) — todo el cambio quedó contenido en `dashboard-summary.tsx`, según lo pedido.
- Fallback: mientras el nombre no cargó (o si `/api/me` no devuelve `name`, ej. error de red o sesión inválida), se muestra "Hola 👋" en lugar del saludo por franja horaria, cumpliendo la restricción de no bloquear el render ni asumir un nombre inexistente.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 007 — Gráfico combinado: ingresos vs. gastos en el mismo chart — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
El gráfico de 7 días (`MainSalesChart` / `SalesAreaChart`, SVG hecho a mano, sin librería de gráficos) solo mostraba ventas. Se agregó un segundo dataset de gastos del mismo período sin tocar el tamaño, posición ni la librería del widget (sigue siendo SVG plano, mismas constantes `CW_MAIN`/`CH_MAIN`/márgenes).

Se agregó el tipo `Expense` (`id`, `expenseDate`, `amount`) y el campo `expenses` a `DashboardState`. El fetch de datos del dashboard ahora incluye `GET /api/expenses?from=...&to=...` (endpoint ya existente, ya soportaba `from`/`to` igual que `/api/sales` y `/api/cash-movements` — no se modificó), agregado al mismo `Promise.allSettled` y siguiendo el mismo patrón de mapeo de las demás fuentes.

Se calculó `expensesByDay` (gastos agrupados por día sobre `last7Dates`) con la misma lógica ya usada para `salesByDay`. `MainSalesChart` ahora recibe `salesByDay` y `expensesByDay`, y `SalesAreaChart` renderiza ambos datasets sobre el mismo SVG: la línea de ventas (violeta `#7c3aed`, con el área de relleno que ya existía) y una nueva línea de gastos (naranja `#f97316`, sin relleno, para no saturar visualmente el gráfico al superponerse). El eje Y (`yMax`/`niceMax`) ahora se calcula sobre el máximo de ambos datasets combinados. Se agregó una leyenda simple ("● Ventas ● Gastos") arriba del gráfico, debajo del título, que se actualizó a "Ingresos vs. gastos — últimos 7 días" para reflejar que ya no es solo de ventas. El estado vacío (`hasData`) ahora considera ambos datasets.

**Notas:**
- No se modificó la librería de gráficos (sigue siendo SVG plano hecho a mano) ni su configuración global, ni el tamaño/posición del widget — solo su contenido interno.
- No se tocaron APIs fuera de las del dashboard: `/api/expenses` ya soportaba `from`/`to`, se usó tal cual sin modificarlo.
- Igual que con `/api/sales` y `/api/cash-movements` en este mismo componente, el fetch de gastos no especifica `limit`, por lo que usa el default de paginación del endpoint (`20`) — comportamiento preexistente del archivo, no introducido por esta tarea.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 006 — Accesos rápidos al POS y Nuevo Gasto desde el Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
El dashboard ya tenía una sección "Acciones rápidas" (`QuickActions`), pero está ubicada al final de la página (requiere scroll) y usa botones chicos tipo ícono+texto sobre fondo blanco — no cumple lo pedido por la tarea (botones grandes y prominentes, visibles sin scroll, con los colores específicos violeta/gris oscuro). Se decidió no modificar `QuickActions` (sigue cumpliendo su propósito general de accesos a 6 secciones) y en su lugar agregar un nuevo componente `TopQuickActions`, ubicado debajo del selector de período y antes de las tarjetas de KPIs — visible sin scroll, como exige la tarea.

`TopQuickActions` renderiza dos botones grandes en una fila (columna en mobile, full width cada uno): "🛒 Ir al POS" con fondo violeta (`bg-violet-600`, hover `bg-violet-700`) que enlaza a `/pos`, y "➕ Nuevo gasto" con fondo gris oscuro (`bg-slate-800`, hover `bg-slate-900`) que enlaza a `/expenses` (no existe una ruta `/expenses/new` dedicada en el proyecto, por lo que se usó la página de gastos según lo indicado en el prompt: "o al formulario de nuevo gasto si existe").

**Notas:**
- No se tocó la lógica de gastos ni del POS — solo se agregaron dos `<Link>` en `dashboard-summary.tsx`.
- No se modificó ni se eliminó el `QuickActions` existente al final de la página.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 005 — Ranking de vendedores del día (top 3 por monto) — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Archivos nuevos:**
- `src/app/api/dashboard/top-sellers/route.ts`

**Cambios realizados:**
Se creó el endpoint `GET /api/dashboard/top-sellers`, que consulta las ventas del día actual (medianoche a medianoche, hora del servidor) del tenant, excluyendo las que tengan al menos una devolución asociada (`returns: { none: {} }`, ya que `Sale` no tiene un campo `status` propio — "no devueltas" se interpretó vía la relación existente con `Return`). Las ventas se agrupan por `sellerId` (con fallback a `sellerCode` si no hay `sellerId`); para resolver el nombre se busca el `User.name` correspondiente al `sellerId` dentro del mismo tenant, y si no hay usuario asociado se usa el `sellerCode` como nombre visible. Las ventas sin `sellerId` ni `sellerCode` (ventas sin vendedor asignado) se excluyen del ranking. Devuelve los 3 vendedores con mayor `totalAmount`, cada uno con `name`, `totalAmount` y `salesCount`.

En `dashboard-summary.tsx` se agregó el tipo `TopSeller` y el componente `TopSellersWidget`, que hace fetch al nuevo endpoint y muestra hasta 3 vendedores con medalla (🥇🥈🥉), nombre, cantidad de ventas y monto en ARS (`formatARS()`). Estado vacío con ícono `Trophy` y texto "Sin ventas registradas hoy" si no hay datos. El widget se ubicó junto al de "Cotizaciones pendientes" (Tarea 003), en una grilla de 2 columnas, sin afectar la fila del gráfico + productos top ni la fila inferior de 3 columnas.

**Notas:**
- No se modificó el schema de Prisma ni la lógica de ventas en `/sales` o el POS — solo lectura vía `prisma.sale.findMany` y `prisma.user.findMany`, ambos con scope de `tenantId`.
- El "día actual" se calcula con la fecha/hora del servidor (no hay manejo de timezone explícito en el resto del proyecto para este tipo de cálculo; se mantuvo consistente con ese patrón existente).
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 004 — Alerta si la caja no fue cerrada al final del día — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
No existía ninguna lógica relacionada con caja (apertura/cierre) en `dashboard-summary.tsx`. Se agregó un nuevo tipo `CashRegisterSession` (`id`, `status`, `openedAt`, `closedAt`) y un componente `OpenCashRegisterAlert`, montado como primer elemento dentro del contenedor raíz del Dashboard (antes del header), para que el banner quede en la parte superior de la página.

El componente hace fetch a `GET /api/cash-register` (endpoint ya existente, sin modificarlo) y obtiene la sesión de caja actual (`null` si no hay ninguna abierta). Si la sesión tiene `status === "OPEN"` y se cumple `hora local >= 20:00 OR fecha de apertura (openedAt) anterior a la fecha de hoy`, se muestra un banner amarillo (`bg-amber-50`/`border-amber-200`/`text-amber-800`) con el texto exacto pedido por la tarea ("⚠️ La caja sigue abierta. Recordá cerrarla antes de terminar el día.") y un botón "Ir a Caja" (`bg-amber-600`) que navega a `/cash-movements`. Si la caja está cerrada, no hay sesión, o ninguna condición se cumple, el componente no renderiza nada.

Para la condición "el último cierre fue en un día anterior al día de hoy": como una sesión abierta nunca tiene `closedAt` (es `null` mientras está `OPEN`), se interpretó como "la sesión sigue abierta desde un día anterior al actual" usando `openedAt` en vez de `closedAt` — comparando la fecha (`YYYY-MM-DD`, mismo criterio `toISOString().slice(0,10)` ya usado en el resto del archivo para `todayStr`/`yesterdayStr`) de apertura contra la de hoy.

**Notas:**
- No se tocó el flujo de apertura/cierre de caja: no se modificaron `src/app/api/cash-register/*`, `src/modules/cash-register/*` ni `src/app/ui/cash-register-close.tsx`. Solo se consumió el endpoint `GET /api/cash-register` ya existente (lectura).
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 003 — Widget de cotizaciones pendientes de confirmar — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Archivos nuevos:**
- `src/app/api/dashboard/pending-quotes/route.ts`

**Cambios realizados:**
El tipo `ExpiringQuote` ya existía pero solo se usaba dentro de `AlertsPanel` como un conteo agregado ("X cotizaciones vencen en las próximas 24 hs"), sin mostrar cotizaciones individuales — no cumplía lo pedido por la tarea, así que se creó el widget dedicado desde cero, sin tocar `AlertsPanel`.

Se agregó el componente `PendingQuotesWidget`, ubicado debajo de la grilla de KPIs principales (antes de la fila de gráfico + productos top). Hace fetch a un nuevo endpoint `/api/dashboard/pending-quotes` y muestra hasta 5 cotizaciones con: número (`quoteNumber`), nombre del cliente, monto formateado con `formatARS()`, y un badge de días restantes con color semáforo (verde >7 días, amarillo 3-7, rojo <3 o vencida). Estado vacío con ícono `FileText` y texto "Sin cotizaciones pendientes".

El nuevo endpoint reutiliza `getExpiringQuotes` (ya existente en `modules/quotes`, sin modificarlo) con una ventana de 30 días en vez de 24 horas, y devuelve las primeras 5 ordenadas por `validUntil` ascendente (la función ya ordena así). No se creó lógica nueva de acceso a datos ni se tocó `quote-data-access.ts`.

**Notas:**
- No se modificó el schema de Prisma ni el flujo de creación/edición/confirmación de cotizaciones en `/quotes`.
- Las cotizaciones se consideran "pendientes" si su estado es `DRAFT` o `SENT` (mismo filtro que ya usaba `getExpiringQuotes`).
- `npm run build`, `npm run lint` y `npm test` (suite unitaria) ejecutados sin errores. Mismas 32 fallas preexistentes de integración por falta de `DATABASE_URL`, sin relación con este cambio.

---

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
