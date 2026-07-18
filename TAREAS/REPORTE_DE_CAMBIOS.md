# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

FIX-11 — "Cambiar contraseña" no funcionaba y mentía que funcionó (2026-07-18). Bug documentado en `CLAUDE.md` sección 5: `src/app/api/auth/change-password/route.ts` no verificaba sesión (cualquiera podía llamarlo sin login), comparaba `currentPassword` contra la env var global `SOLVEN_PASSWORD` en vez del hash real del usuario, y nunca persistía `newPassword` — respondía `{ ok: true }` sin cambiar nada en la base de datos.

Reescritura completa del endpoint:
1. `getSession()` de `@/lib/tenant` — 401 si no hay sesión.
2. Valida `newPassword` con longitud mínima 8 caracteres (mismo mensaje que `user-validation.ts`: "La contraseña debe tener al menos 8 caracteres.") — 400 si no cumple.
3. Carga el usuario real con `prisma.user.findFirst({ where: { id: session.userId, tenantId: session.tenantId } })`.
4. Verifica `currentPassword` contra `user.password` con `verifyPassword()` de `@/lib/auth` (ya no contra `SOLVEN_PASSWORD`) — 401 "La contraseña actual es incorrecta." si no coincide (mensaje preservado).
5. Hashea `newPassword` con `hashPassword()` y persiste con `prisma.user.update({ where: { id: user.id, tenantId: session.tenantId }, data: { password: hashedNewPassword } })`, mismo patrón defensivo `where: { id, tenantId }` que usa `user-data-access.ts`.
6. Responde `{ ok: true }` solo después de que el `update` corrió.

Respuestas de error se mantienen como `NextResponse.json({ error: "mensaje" }, { status })` (string plano, no el helper `_shared/responses`), porque `src/app/ui/settings.tsx` (que no se tocó, por restricción del fix) parsea `body.error` como string — usar el helper `errorResponse()` habría roto silenciosamente el mensaje de error en la UI (el helper anida `{ error: { message, details? } }`, un objeto).

No se tocaron `login/route.ts`, `register/route.ts`, `logout/route.ts`, `verify-password/route.ts`, `switch-cashier/route.ts` ni `settings.tsx`, según restricción del fix. No se agregó invalidación de sesión (no hay infraestructura para eso, JWT stateless, fuera de alcance).

Test nuevo (no existía ninguno): `src/app/api/auth/change-password/route.test.ts`, 4 casos — 401 sin sesión, 400 con `newPassword` corta, 401 con `currentPassword` incorrecta (verifica que se compara contra `user.password`, no contra la env var), y éxito (verifica `prisma.user.update` llamado con la contraseña hasheada correcta y el scope `{ id, tenantId }`). Mocks de `@/lib/prisma`, `@/lib/auth` y `@/lib/tenant` siguiendo el estilo ya usado en `customers/[id]/route.test.ts`.

`typecheck`/`lint` sin errores. `npm test`: 258 passed, 2 skipped (46 archivos + este nuevo test = 47 pasaron; 1 archivo, `core-business-flow.integration.test.ts`, falló en la corrida completa por `Timed out fetching a new connection from the connection pool` de Neon durante el cleanup — no relacionado a este fix, no toca `User` ni auth; confirmado flaky de infraestructura corriéndolo aislado, donde pasó limpio). Commit `cf1541c`.

---

FIX-10 revisado y verificado por el Ingeniero Líder (diff confirmado contra lo pedido en la orden: `ivaRate` agregado a `Service` y `QuoteItem` vía migración solo-ADD-COLUMN, selector de alícuota reutilizando `IVA_RATES` de products en `services.tsx`, y el `0.21` fijo reemplazado por el valor real en `sale-data-access.ts`, `quote-data-access.ts` y `pos.tsx`; `src/lib/arca/*` e `invoices/*` intactos según restricción) — 2026-07-18. Orden archivada, ya cumplió su función. Resumen completo en `TAREAS/REPORTELIDER.md`.

---
