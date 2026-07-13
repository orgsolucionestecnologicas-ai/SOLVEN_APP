# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### TAREA 139 — ✅ Completada
- Qué se hizo: se agregó el rol `SUPERVISOR` (`OWNER | CASHIER | INVENTORY | READONLY | SUPERVISOR`) con acceso de lectura/escritura a Reportes y Clientes (incluida gestión de deudas/pagos), lectura de Ventas/POS igual que `READONLY` (sin acceso de escritura), y sin acceso a Configuración ni Caja. Se agregó `"SUPERVISOR"` al `requireRole` de `POST /api/customers` y `POST /api/debt-payments`. Se ocultaron los links "Caja" y "Ajustes" del sidebar principal (`hiddenForRoles` en `app-shell.tsx`, mecanismo que existía en el tipo pero no se usaba en ningún item) y los paneles "Mi Negocio"/"Usuarios" del sub-menú de Ajustes (`SettingsNav.tsx`) para este rol. Se agregó "Supervisor" al selector de roles y su badge en `users-list.tsx`, y su etiqueta en `SidebarUser` (`app-shell.tsx`).
- Archivos modificados: `prisma/schema.prisma` (+ migración), `src/app/api/customers/route.ts`, `src/app/api/debt-payments/route.ts`, `src/app/ui/app-shell.tsx`, `src/app/settings/components/SettingsNav.tsx`, `src/app/ui/users-list.tsx`.
- Migraciones corridas (si aplica): `20260713181107_add_user_role_supervisor` (agrega valor al enum, aditivo, no rompe usuarios existentes) — Diego debe correr `npx prisma migrate deploy` en producción.
- Algo ya estaba implementado de otra forma / algo quedó pendiente: se revisaron los 36 usos de `requireRole([...])` del proyecto (`Reportes` ya estaba abierto a todos los roles vía `requireTenantId`, sin cambios necesarios). Se decidió **no** agregar `SUPERVISOR` a `POST /api/debts/[id]/write-off` — condonar una deuda es más drástico que "gestionar deudas de clientes" (registrar pagos), se interpretó fuera del alcance otorgado y se dejó exclusivo de `OWNER`; si Diego quiere que Supervisor también condone deudas, es un cambio de una línea. Tampoco se agregó a ningún otro `requireRole` (productos, servicios, proveedores, promociones, facturación/ARCA, ajustes de inventario, cotizaciones, devoluciones, gastos, usuarios, audit-logs, envío de email de venta) por no estar contemplado en el alcance de la tarea — Supervisor igual puede *ver* la mayoría de esos datos porque los `GET` correspondientes ya usan `requireTenantId` sin restricción de rol (comportamiento preexistente para todos los roles, no se tocó). No se restringió `GET /api/settings` (Configuración) porque ya era de lectura abierta para todos los roles desde antes (incluido `READONLY`); cambiar eso afectaría a otros roles y la tarea pide no modificar comportamiento existente — se resolvió ocultando el link de navegación en su lugar.
- typecheck: OK
- Fix de seguimiento (mismo día): se detectó que `USER_ROLES` en `src/modules/users/user-validation.ts` no incluía `"SUPERVISOR"`, por lo que crear un usuario o cambiar su rol a Supervisor habría sido rechazado por la validación del servidor pese a que la UI ya lo ofrecía. Corregido en un commit aparte (`fix: agregar SUPERVISOR a la validacion server-side de roles de usuario`).

### TAREA 124 — ✅ Completada
- Qué se hizo: se agregó `User.lastLoginAt` (nullable) y se actualiza en `POST /api/auth/login` justo después de verificar contraseña/estado activo y antes de crear la sesión. `users-list.tsx` muestra una columna "Último acceso" con la fecha formateada o "Nunca" si es null.
- Archivos modificados: `prisma/schema.prisma`, `src/app/api/auth/login/route.ts`, `src/modules/users/user-data-access.ts` (select/tipo `UserSummary`), `src/app/ui/users-list.tsx`.
- Migraciones corridas (si aplica): `20260713180343_add_user_last_login_at` (nullable, sin backfill) — Diego debe correr `npx prisma migrate deploy` en producción.
- Algo ya estaba implementado de otra forma / algo quedó pendiente: no se implementó indicador de "sesión activa" en tiempo real — las sesiones son JWT sin tabla de sesiones en BD (`src/lib/auth.ts`/`src/lib/tenant.ts` no llevan tracking de sesiones activas), y la tarea explícitamente prohíbe construir ese sistema. Solo se muestra "Último acceso".
- typecheck: OK

### TAREA 122 — ✅ Completada
- Qué se hizo: `DELETE /api/users/[id]` ahora cuenta ventas asociadas por `sellerCode` antes de borrar; si hay ventas y no viene `?confirm=true`, devuelve `{ deleted: false, salesCount }` sin borrar. En `users-list.tsx`, el modal de eliminación muestra ese número y cambia el botón a "Sí, eliminar de todas formas" para el segundo click que sí confirma el borrado.
- Archivos modificados: `src/modules/users/user-data-access.ts`, `src/app/api/users/[id]/route.ts`, `src/app/ui/users-list.tsx`.
- Migraciones corridas (si aplica): ninguna (se usa `Sale.sellerCode` existente, sin FK nueva).
- Algo ya estaba implementado de otra forma / algo quedó pendiente: el modal de confirmación ya existía; se reusó agregando el segundo paso condicional en vez de crear uno nuevo.
- typecheck: OK

### TAREA 121 — ✅ Completada
- Qué se hizo: `SidebarUser` en `app-shell.tsx` ahora muestra el rol del usuario (etiqueta corta en español) debajo del nombre, reusando la misma respuesta de `/api/me` que ya se pedía (que ya incluía `role`) sin agregar un segundo fetch.
- Archivos modificados: `src/app/ui/app-shell.tsx`.
- Migraciones corridas (si aplica): ninguna.
- Algo ya estaba implementado de otra forma / algo quedó pendiente: `/api/me` ya devolvía `role`; solo faltaba capturarlo y renderizarlo en `SidebarUser`. Queda pendiente unificar el fetch duplicado a `/api/me` entre `SidebarUser` y `AppShell` (fuera de alcance de esta tarea).
- typecheck: OK

---

Historial de Tareas 101–120 revisado, marcado como completado en Notion y archivado por el Ingeniero Líder — 2026-07-13.
