# FIX-11 — "Cambiar contraseña" no funciona y miente que funcionó

## Contexto (verificado en código, no es un supuesto)

`src/app/api/auth/change-password/route.ts` (archivo completo, 27 líneas) tiene 3 problemas simultáneos:

1. **No verifica sesión.** No llama a `getSession()`/`requireTenantId()`/`requireRole()` — cualquiera que le pegue al endpoint sin estar logueado puede usarlo.
2. **Compara contra la variable de entorno global `SOLVEN_PASSWORD`**, no contra la contraseña hasheada del usuario real (`User.password` en la tabla). `SOLVEN_PASSWORD` es una única contraseña compartida por todo el entorno, no la contraseña personal de cada usuario.
3. **Nunca persiste `newPassword`.** El body destructura `newPassword` pero no se usa en ningún lado — no hay `hashPassword()`, no hay `prisma.user.update()`. El endpoint responde `{ ok: true }` sin haber cambiado nada.

La UI (`src/app/ui/settings.tsx`, función `SeguridadSection`, línea ~684-729) llama a este endpoint desde el formulario "Cambiar contraseña" y, si la respuesta es `ok`, muestra `"Contraseña actualizada correctamente."` — un mensaje de éxito falso, porque la contraseña real del usuario en la base de datos nunca cambió.

No existe ningún otro mecanismo de cambio de contraseña en el proyecto (confirmado: `src/app/api/users/[id]/route.ts` no toca el campo `password`).

## Qué hacer

Reescribir `src/app/api/auth/change-password/route.ts` para que sea un cambio de contraseña real, scoped al usuario autenticado:

1. Importar `getSession` desde `@/lib/tenant` (mismo patrón que el resto del proyecto). Si `getSession()` devuelve `null`, responder 401 (mismo estilo `NextResponse.json({ error: ... }, { status: 401 })` que ya usan `login/route.ts` y `register/route.ts` — no hace falta usar los helpers de `_shared/responses`, esta carpeta `auth/` no los usa en ningún otro archivo).
2. Validar `newPassword`: string, longitud mínima 8 caracteres — mismo criterio que `validateCreateUserInput` en `src/modules/users/user-validation.ts:46-48` ("La contraseña debe tener al menos 8 caracteres."). Si no cumple, 400.
3. Cargar el usuario real: `prisma.user.findFirst({ where: { id: session.userId, tenantId: session.tenantId } })`. Si no existe (no debería pasar nunca, pero por defensividad), 401.
4. Verificar `currentPassword` contra `user.password` con `verifyPassword()` de `@/lib/auth` (mismo helper que usa `login/route.ts:27`) — NO contra `process.env.SOLVEN_PASSWORD`. Si no coincide, 401 "La contraseña actual es incorrecta." (mensaje ya existente, mantenerlo).
5. Hashear `newPassword` con `hashPassword()` de `@/lib/auth` y persistir: `prisma.user.update({ where: { id: user.id, tenantId: session.tenantId }, data: { password: hashedNewPassword } })` — seguir el mismo patrón `where: { id, tenantId }` que ya usa `src/modules/users/user-data-access.ts` (`updateUserRole`, `setUserActive`, etc.) para scope defensivo.
6. Responder `{ ok: true }` solo después de que el `update` haya corrido.

`SOLVEN_PASSWORD` deja de usarse en este archivo. No tocar ningún otro uso de esa env var si lo hubiera (verificado: no lo hay, es el único lugar del código que la referenciaba).

## Restricciones estrictas

- No inventar un flujo de "recuperar contraseña por email" — eso es una feature distinta y más grande, fuera de alcance de este fix. Este fix es solo: que "cambiar mi contraseña estando logueado" haga lo que dice que hace.
- No tocar `login/route.ts`, `register/route.ts`, `logout/route.ts`, `verify-password/route.ts`, ni `switch-cashier/route.ts`.
- No tocar `src/app/ui/settings.tsx` — el frontend ya envía el payload correcto (`currentPassword`, `newPassword`), el bug es 100% del backend.
- No invalidar sesiones activas ni forzar re-login — no hay infraestructura de invalidación de sesión en el proyecto (JWT stateless), agregar eso sería un cambio mucho más grande y no fue pedido.

## Archivos afectados (esperados)
- `src/app/api/auth/change-password/route.ts` (reescritura completa)
- Test nuevo: `src/app/api/auth/change-password/route.test.ts` (no existe ninguno hoy). Cubrir como mínimo: 401 sin sesión, 400 con `newPassword` corta, 401 con `currentPassword` incorrecta, éxito real (verificar que se llamó a `prisma.user.update` con la contraseña hasheada correcta, mockeando `@/lib/prisma`, `@/lib/auth` y `@/lib/tenant` — seguir el estilo de mocks de otros `route.test.ts` en `src/app/api/`).

## Protocolo de reporte
1. `npm run typecheck` y `npm run lint` sin errores.
2. `npm test` sin regresiones (reportar cuántos passed).
3. Commit + `git push origin main`.
4. Agregar entrada a `TAREAS/REPORTE_DE_CAMBIOS.md` con el detalle técnico completo.
5. Agregar entrada corta (2-4 líneas) a `TAREAS/REPORTELIDER.md` (NO borrar el archivo, solo agregar al final).
6. Entregable breve en el chat.
