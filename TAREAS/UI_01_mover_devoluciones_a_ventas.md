# UI-01 — Mover "Devoluciones" del menú principal a una pestaña dentro de Ventas

> Pedido de Diego: sacar "Devoluciones" del panel/menú principal y ponerlo al lado de "Venta actual" / "Historial", como pestaña dentro de la sección Ventas — para comprimir el menú y hacerlo más liviano visualmente. No es un bug, es reorganización de UI. Ya se investigó toda la estructura relevante (ver referencias exactas abajo), no hace falta re-explorar desde cero.

## Contexto exacto (ya verificado en el código)

- **Nav principal**: `src/app/ui/app-shell.tsx`, array `navItems` (línea 65-77). El ítem de Devoluciones es la línea 68: `{ type: "link", href: "/returns", label: "Devoluciones", section: "returns", Icon: RotateCcw }`. No tiene `hiddenForRoles` — hoy es visible para todos los roles por defecto, salvo que un `OWNER` lo restrinja explícitamente desde Ajustes → Usuarios → Permisos (`RolePermission`, sección `"returns"`).
- **Ruta standalone**: `src/app/returns/page.tsx` — solo envuelve `<Returns />` en `<AppShell activeSection="returns" ... title="Devoluciones">`. Confirmado por grep que **ningún otro archivo** navega a `/returns` (ni `Link href`, ni `router.push`) — se puede eliminar la ruta sin romper ningún enlace interno. Los endpoints `/api/returns/*` no se tocan, son independientes de esta página.
- **Componente `Returns`**: `src/app/ui/returns.tsx` (945 líneas). Su `return (...)` (línea 259) arranca con un wrapper `<div className="flex min-h-screen flex-col bg-slate-50">` que incluye un header propio de página completa (línea 260-297): breadcrumb "Operaciones / Devoluciones" + `<h1>Devoluciones</h1>` + su propia barra de sub-pestañas interna ("Nueva devolución" / "Historial", con estado `activeTab` local ya existente en el componente). Ese header de página completa ya no debe existir una vez que esto viva dentro de una pestaña — hoy sería un duplicado.
- **Pestañas de Ventas**: `src/app/ui/pos.tsx`. `TABS` (línea 253) es hoy `["Venta actual", "Historial"]`, con estado `activeTab` (línea 345). El render de la barra de pestañas está en línea 1462-1479, y el switch de contenido en línea 1482-1484: `activeTab === "Historial" ? <SalesList /> : (...) UI completa del POS`. `SalesList` (`sales-list.tsx`) es el ejemplo a imitar: su `return` (línea 218) arranca directo con `<section className="px-5 py-6 sm:px-8">`, **sin** breadcrumb ni `<h1>` propio — así es como debe quedar `Returns` una vez embebido.
- **Permisos del recurso**: `POST /api/returns` exige `requireRole(["OWNER","CASHIER"], "returns")` (`src/app/api/returns/route.ts:60`); `GET /api/returns` (el historial) hoy no exige rol, solo sesión válida — eso no se toca, es un comportamiento ya existente y no forma parte de este pedido.
- **Permisos de la pantalla de Ajustes**: `role-permissions-table.tsx` tiene su propio array `SECTIONS` (línea 8-…) con `{ value: "returns", label: "Devoluciones" }` como entrada **independiente** del array `navItems` de `app-shell.tsx` — no depende del ítem de nav que se va a borrar, no hay que tocar ese archivo.

## Qué hacer

### 1. `src/app/ui/app-shell.tsx`
- Eliminar la línea 68 del array `navItems` (el ítem `href: "/returns"`).
- Dejar el valor `"returns"` en el tipo `NavSection` (línea ~36) tal cual está — sigue siendo un valor válido de sección para `RolePermission`, no hace falta tocarlo.

### 2. Eliminar la ruta standalone
- Borrar `src/app/returns/page.tsx` (confirmado sin otros enlaces internos hacia `/returns`).

### 3. `src/app/ui/returns.tsx`
- Quitar el header de página completa: el breadcrumb "Operaciones / Devoluciones" y el `<h1>Devoluciones</h1>` (dentro del bloque línea 260-269 aproximadamente). **No tocar** la barra interna de sub-pestañas "Nueva devolución" / "Historial" (línea 271-296 aprox.) — esa sigue siendo válida y útil dentro de la pestaña.
- Ajustar el `<div>` contenedor externo (hoy `className="flex min-h-screen flex-col bg-slate-50"`) para que no asuma que es una página completa — quitar `min-h-screen` (o el equivalente que corresponda) siguiendo el mismo criterio visual que ya usa `SalesList` (sin asumir alto de página completa, ya que ahora vive dentro del layout de `Pos`).
- Verificar visualmente (o por lectura cuidadosa del JSX) que no quede un contenedor vacío o mal alineado tras sacar el header.

### 4. `src/app/ui/pos.tsx`
- Importar `Returns` desde `./returns`.
- Cambiar `TABS` (línea 253) a `["Venta actual", "Historial", "Devoluciones"]`.
- **Visibilidad por rol/permiso** — esto es importante, no opcional: hoy "Devoluciones" es visible en el nav para todos los roles salvo que `RolePermission` lo restrinja explícitamente para ese rol+sección `"returns"`. Al mover esto a una pestaña interna de `Pos`, hay que preservar exactamente ese mismo comportamiento, si no se pierde el control de acceso que ya existía:
  - `Pos()` hoy no tiene acceso a `role` ni `rolePermissions` (esos solo se obtienen en `AppShell`, vía `/api/me` y `/api/role-permissions`, y no se pasan a los hijos). Agregar esos mismos dos `fetch` dentro de `Pos()` (mismo patrón exacto que ya existe en `AppShell`, línea 409-427 de `app-shell.tsx`) para tener `role`/`rolePermissions` disponibles localmente.
  - Calcular si la pestaña "Devoluciones" debe mostrarse con la misma fórmula que ya usa `visibleNavItems` en `app-shell.tsx` (línea 429-434): default visible (ya que el ítem no tenía `hiddenForRoles`), pero si `rolePermissions?.[`${role}:returns`]` está definido, ese valor manda. No inventar una regla nueva — replicar la misma.
  - Filtrar el `.map(TABS)` de la barra de pestañas (línea 1463) para no renderizar el botón "Devoluciones" si no corresponde para el rol actual.
- Actualizar el switch de contenido (línea 1482-1484) a tres vías: `"Historial"` → `<SalesList />`, `"Devoluciones"` → `<Returns />`, cualquier otro (`"Venta actual"`) → la UI completa del POS que ya existe.

## Restricciones estrictas

1. No tocar los endpoints `/api/returns/*` — el backend no cambia en nada.
2. No tocar `role-permissions-table.tsx` ni el array `SECTIONS` — ya están desacoplados del nav, siguen funcionando igual.
3. No cambiar el comportamiento de `GET /api/returns` (historial sin restricción de rol) — no es parte de este pedido.
4. La pestaña "Devoluciones" debe respetar la misma visibilidad por rol que tenía el ítem de nav — no mostrarla a roles a los que un `OWNER` ya les haya restringido `returns` desde Permisos, y no ocultarla de más (por defecto visible, igual que hoy).
5. No duplicar contenido — el objetivo es que `Returns` viva en un solo lugar (la pestaña), no que quede accesible desde dos rutas distintas.

## Archivos afectados (esperados)

- `src/app/ui/app-shell.tsx`
- `src/app/returns/page.tsx` (eliminado)
- `src/app/ui/returns.tsx`
- `src/app/ui/pos.tsx`

## Protocolo de reporte

1. `npm run typecheck` y `npm run lint` sin errores → `git add -A && git commit -m "feat: mover Devoluciones del menu principal a una pestaña dentro de Ventas" && git push origin main`.
2. Correr `npm test` y confirmar que no hay regresiones nuevas (las 2 fallas preexistentes documentadas — si siguen ahí — no cuentan como regresión de esta tarea).
3. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md` un reporte breve: qué se cambió en cada uno de los 4 archivos, cómo quedó la visibilidad por rol, resultado de typecheck/lint/tests, hash del commit.
4. Agregar una entrada corta (2-4 líneas) arriba de todo en `TAREAS/REPORTELIDER.md` (formato `### 2026-07-17 — UI-01: [resumen]`) — sin borrar las entradas existentes.
5. Entregable en el chat: breve — archivos modificados, cómo verificaron que la visibilidad por rol quedó igual que antes, resultado de typecheck, hash del commit.
