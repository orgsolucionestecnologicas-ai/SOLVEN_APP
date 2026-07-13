# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

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
