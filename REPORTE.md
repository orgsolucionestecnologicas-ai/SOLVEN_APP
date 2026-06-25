# REPORTE — Unificar Configuración, Usuarios y Cuenta en sección Ajustes

## Archivos creados
- `src/app/settings/layout.tsx` — layout de dos columnas (AppShell + nav interna + contenido)
- `src/app/settings/components/SettingsNav.tsx` — nav izquierda fija (220px), 3 ítems con estado activo via searchParam `s`
- `src/app/settings/components/SettingsContent.tsx` — router de contenido por `s` (cliente, useSearchParams)
- `src/app/settings/components/NegocioPanel.tsx` — encabezado "Mi Negocio" + componente existente `Settings`
- `src/app/settings/components/UsuariosPanel.tsx` — encabezado "Usuarios" + componente existente `UsersList`
- `src/app/settings/components/SuscripcionPanel.tsx` — encabezado "Suscripción" + componente existente `CuentaSubscription`

## Archivos modificados
- `src/app/settings/page.tsx` — pasa a ser router envuelto en `<Suspense>` (patrón ya usado en `cash-movements/new/page.tsx` para componentes con `useSearchParams`)
- `src/app/usuarios/page.tsx` — reemplazado por redirect a `/settings?s=usuarios`
- `src/app/cuenta/page.tsx` — reemplazado por redirect a `/settings?s=suscripcion`
- `src/app/ui/app-shell.tsx` — unifica 3 ítems del sidebar ("Configuración", "Usuarios", "Mi cuenta") en uno solo ("Ajustes" → `/settings`); elimina `"usuarios"` y `"cuenta"` de `ActiveSection`; elimina imports de iconos `User`/`UserCog` ya sin uso

## Resultado de npm run typecheck
Sin errores.

## Resultado de npm test
198 tests passed, 2 skipped (41 archivos, 39 passed).

## Verificación manual (servidor dev + curl con sesión autenticada)
- `/settings` → 200, muestra "Mi Negocio" por defecto
- `/settings?s=usuarios` → 200, panel Usuarios
- `/settings?s=suscripcion` → 200, panel Suscripción
- `/usuarios` → 307 → `/settings?s=usuarios`
- `/cuenta` → 307 → `/settings?s=suscripcion`
- Sidebar principal: un solo ítem "Ajustes", sin duplicados

## Decisiones tomadas
Los 3 ítems originales del sidebar tenían restricciones de rol distintas: "Configuración" oculto para CASHIER/READONLY, "Usuarios" oculto para CASHIER/INVENTORY/READONLY, "Mi cuenta" visible para todos los roles. Al unificarlos en un solo ítem "Ajustes" no es posible aplicar una sola regla de visibilidad sin perder permisos de alguno de los tres. Decisión: el ítem "Ajustes" del sidebar principal queda visible para todos los roles (igual que "Mi cuenta" antes), y las restricciones de rol originales de "Mi Negocio" y "Usuarios" se preservaron moviéndolas a la nav interna de `/settings` (`SettingsNav.tsx`), que oculta esas dos pestañas para los roles que no tenían acceso. La aplicación real de permisos sigue ocurriendo en las APIs (`requireRole`), no tocadas.

## Problemas encontrados
Ninguno.
