# TESTS-01 — Cobertura de tests: quotes, reports, users, subscription, webhooks

## Contexto

`CLAUDE.md` sección 11 (auditoría 2026-07-18) confirma que estos 5 módulos no tienen ningún test, verificado por ausencia de archivos `*.test.ts`. No son bugs — son módulos funcionando en producción sin red de seguridad. El objetivo de esta orden es **cobertura base real** (camino feliz + los errores más importantes de cada uno), no cobertura exhaustiva de cada variante. Seguir el estilo de mocks ya usado en el proyecto — ejemplos concretos de referencia ya existentes: `src/app/api/customers/[id]/route.test.ts`, `src/app/api/services/route.test.ts`, `src/app/api/invoices/route.test.ts`, `src/app/api/auth/change-password/route.test.ts` (este último es el más reciente, mockea `@/lib/prisma`, `@/lib/auth`, `@/lib/tenant` con `vi.mock` + `vi.mocked`).

**Regla general para toda esta orden: si al escribir un test se descubre que el código no hace lo que debería (un bug real, no solo falta de test), NO arreglarlo silenciosamente — parar, documentarlo en el reporte con el archivo/línea exacto, y dejarlo para que Diego decida. Esta orden es solo para agregar tests, no para tocar lógica de negocio.**

---

## 1. `quotes`

Archivos relevantes: `src/modules/quotes/quote-validation.ts` (validación pura, fácil de testear sin mocks), `src/modules/quotes/quote-data-access.ts` (`createQuote`, `listQuotes`, `confirmQuote`, `expireOverdueQuotes`), `src/app/api/quotes/route.ts` (GET/POST), `src/app/api/quotes/[id]/confirm/route.ts`.

- `src/modules/quotes/quote-validation.test.ts` (nuevo): cubrir `validateCreateQuoteInput` — acepta un input válido con producto, acepta uno válido con servicio, rechaza sin items, rechaza sin `customerId` ni `customerName`, rechaza email con formato inválido, rechaza item con producto Y servicio a la vez, rechaza cantidad no entera o `<= 0`.
- `src/app/api/quotes/route.test.ts` (nuevo): GET requiere sesión (401 sin ella), POST requiere rol `OWNER`/`CASHIER` con sección `quotes` (403 para otros roles), POST con body inválido devuelve 400 con los `reasons` de `QuoteValidationError`, POST exitoso llama a `createQuote` y devuelve 201.
- Si el tiempo lo permite: un test para `POST /api/quotes/[id]/confirm` cubriendo el camino feliz (confirma y crea la venta) — es el único endpoint de este módulo que mueve plata/stock real (convierte presupuesto en venta), por eso vale la pena aunque el resto del módulo quede con cobertura más liviana.

## 2. `reports`

Archivos: `src/app/api/reports/export/route.ts` (CSV de ventas o productos, según `?type=`), `src/app/api/reports/export-pdf/route.tsx`.

- `src/app/api/reports/export/route.test.ts` (nuevo): sin sesión → 401 (mockear `requireTenantId` para que rechace). Con sesión: `?type=ventas` devuelve `Content-Type: text/csv` y un header CSV que empieza con `fecha,folio,cliente,forma_pago,productos,total`; `?type=productos` devuelve el header `nombre,codigo,...,iva`; un `type` inválido devuelve 400 con `{error:{message:...}}`. No hace falta testear el contenido completo del CSV línea por línea, alcanza con confirmar headers, status, y que se llama a `prisma.sale.findMany`/`prisma.product.findMany` con `where: { tenantId }`.
- `export-pdf`: si genera un PDF binario complejo (usa `@react-pdf/renderer`), un test de "no revienta y responde 200 con el tenant correcto" alcanza — no hace falta parsear el PDF.

## 3. `users`

Archivos: `src/modules/users/user-validation.ts` (ya tiene funciones puras, sin test hoy), `src/modules/users/user-data-access.ts`, `src/app/api/users/route.ts` (GET/POST), `src/app/api/users/[id]/route.ts` (PATCH/DELETE).

- `src/modules/users/user-validation.test.ts` (nuevo): `validateCreateUserInput` — acepta válido, rechaza contraseña de menos de 8 caracteres, rechaza rol inválido, rechaza nombre/email vacío. `validateUpdateUserRoleInput` — acepta rol válido, rechaza inválido.
- `src/app/api/users/route.test.ts` (nuevo): GET requiere `OWNER`/`CASHIER` (403 para otros), POST requiere `OWNER` estrictamente (403 para `CASHIER` incluso), POST exitoso registra auditoría (`logAudit` llamado) y devuelve 201.
- `src/app/api/users/[id]/route.test.ts` (nuevo): PATCH con `active` cambia estado (llama `setUserActive`), PATCH con `role` cambia rol (llama `updateUserRole`) — probar que un usuario **no puede desactivarse ni cambiar su propio rol** (`setUserActive`/`updateUserRole` ya tiran `UserValidationError` si `id === currentUserId`, verificado en `user-data-access.ts:109` y `:128` — cubrir ese caso específicamente, es una regla de negocio real). DELETE con ventas asociadas y sin `?confirm=true` devuelve `deleted:false` con `salesCount`; con `?confirm=true` borra de verdad.

## 4. `subscription`

Archivo: `src/app/api/subscription/route.ts` (GET único, muy simple — `requireTenantId` + `prisma.subscription.findUnique`).

- `src/app/api/subscription/route.test.ts` (nuevo): sin sesión → 401. Sin `Subscription` en DB → devuelve `{status:"TRIAL", trialEndsAt:null, daysLeft:null}`. Con subscripción activa y `trialEndsAt` en el futuro → `daysLeft` calculado correctamente (verificar el redondeo hacia arriba, `Math.ceil`). Con `trialEndsAt` en el pasado → `daysLeft: 0` (por el `Math.max(0, ...)`).

## 5. `webhooks` (Rebill)

Archivo: `src/app/api/webhooks/rebill/route.ts`. **No tocar la lógica del endpoint en esta orden** (el bypass de firma sin `REBILL_WEBHOOK_SECRET` es un hallazgo ya documentado — `CLAUDE.md` sección 5 — que Diego decidió posponer a fin de proyecto, no es parte de esta tarea).

- `src/app/api/webhooks/rebill/route.test.ts` (nuevo), mockeando `@/lib/prisma` y `@/lib/email`: para cada uno de los 5 tipos de evento (`subscription.activated`/`subscription.created`, `payment.success`/`invoice.paid`, `payment.failed`/`invoice.payment_failed`, `subscription.cancelled`, `subscription.trial_will_end`) verificar que se actualiza el `Subscription` correcto y se llama al email correspondiente. JSON inválido en el body → 400. Si es razonable sin reescribir el endpoint, agregar también un test que documente el comportamiento actual de la firma (con `REBILL_WEBHOOK_SECRET` seteado en el entorno de test vía `vi.stubEnv`, una firma inválida debe devolver 401) — esto es cobertura de lo que YA existe, no un cambio de lógica.

---

## Restricciones estrictas
- Solo agregar archivos de test nuevos. No modificar ningún archivo de producción (`route.ts`, `*-validation.ts`, `*-data-access.ts`) salvo que sea estrictamente necesario para poder testear (por ejemplo, exportar algo que hoy no se exporta) — si eso pasa, documentarlo explícitamente en el reporte.
- No agregar tests contra la base de datos real ni contra AFIP/Rebill real — todo con mocks, como el resto del proyecto.
- Si algún test revela un bug real de negocio (no solo falta de cobertura), no arreglarlo en esta orden — documentarlo aparte en el reporte con detalle suficiente para que se pueda convertir en una orden de fix propia.

## Protocolo de reporte
1. `npm run typecheck` y `npm run lint` sin errores.
2. `npm test` sin regresiones (reportar cuántos passed, y cuántos tests nuevos se agregaron por módulo).
3. Commit + `git push origin main`.
4. Agregar entrada a `TAREAS/REPORTE_DE_CAMBIOS.md` con el detalle técnico completo, desglosado por los 5 módulos.
5. Agregar entrada corta (2-4 líneas) a `TAREAS/REPORTELIDER.md` (NO borrar el archivo, solo agregar al final).
6. Si se encontró algún bug real durante el trabajo (ver restricciones), listarlo aparte y claramente marcado como "hallazgo, no corregido" en el reporte.
7. Entregable breve en el chat.
