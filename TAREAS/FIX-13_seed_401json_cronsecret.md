# FIX-13 — 3 bugs críticos verificados (QA-01, QA-02, QA-04 de PENDIENTES.md)

> Vienen de la migración de Notion a `TAREAS/PENDIENTES.md` (18-07-2026, sección 🔴 Crítico). Los 3 se verificaron contra el código real antes de escribir esta orden — siguen rotos. Son independientes entre sí, se pueden resolver en cualquier orden, pero van en una sola orden porque los 3 son chicos.

---

## Bug 1 (QA-01) — Seed roto por `productCode` único global

`scripts/seed-icase.mjs`, función `createProduct` (línea ~215), usa `prisma.product.create({ data: { ..., productCode: code, ... } })` con un código fijo por producto. `productCode` es `@unique` global en `prisma/schema.prisma:156`. Si el seed se re-ejecuta sobre una base que ya tiene esos productos, falla con `P2002` y no hay forma de regenerar los fixtures sin borrar todo a mano primero.

**Fix:** cambiar `prisma.product.create(...)` por `prisma.product.upsert({ where: { productCode: code }, update: {...mismos campos...}, create: {...mismos campos...} })` dentro de `createProduct`. Mantener el resto de la función igual (el `prodCount++` u otra lógica de conteo que exista, si la hay). No tocar el schema — el `@unique` está bien, el problema es solo el script.

---

## Bug 2 (QA-02) — APIs devuelven redirect HTML en vez de 401 JSON

`src/middleware.ts`, líneas ~78-90: cuando no hay `token` o `verifySession(token)` falla, el middleware hace `NextResponse.redirect(new URL("/login", request.url))` sin distinguir si el `pathname` es una ruta de página o una ruta `/api/*`. Un cliente que no sea el navegador (fetch externo, app mobile, integración) recibe HTML de redirect en vez de un 401 JSON limpio.

**Fix:** en los dos puntos donde hoy se hace `redirect(new URL("/login", ...))` (falta de token, sesión inválida), si `pathname.startsWith("/api/")` devolver en su lugar `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`; si no, mantener el redirect a `/login` como está. Mismo criterio para los 2 redirects a `/suscripcion-vencida` (líneas ~92-97, por estado de suscripción `CANCELLED`/`EXPIRED`/trial vencido): si es `/api/*`, devolver JSON con el status que corresponda (sugerido 402 o 403, a tu criterio, con un `error` descriptivo) en vez de redirect. No tocar `isPublic()` ni el resto del archivo.

---

## Bug 3 (QA-04, alcance ampliado a los 3 cron jobs) — `CRON_SECRET` opcional en vez de obligatorio

Mismo patrón exacto, roto igual, en los 3 archivos:
- `src/app/api/cron/expire-quotes/route.ts`
- `src/app/api/cron/generate-recurring-expenses/route.ts`
- `src/app/api/cron/remind-expiring-quotes/route.ts`

Los 3 tienen:
```ts
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return errorResponse("Unauthorized", 401);
}
```
Si `CRON_SECRET` no está seteado en el entorno, la condición `cronSecret && ...` es `false` y cualquiera puede disparar el cron sin autenticación.

**Fix:** en los 3 archivos, exigir siempre el secreto salvo en desarrollo local explícito:
```ts
const cronSecret = process.env.CRON_SECRET;
if (process.env.NODE_ENV !== "development" || cronSecret) {
  if (authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse("Unauthorized", 401);
  }
}
```
(Ajustá la forma exacta si hay una mejor manera de expresarlo con el resto del estilo del proyecto — la idea es: en producción, si no hay `CRON_SECRET` configurado, el cron debe rechazar todo en vez de dejar pasar todo.) Confirmar que `vercel.json` ya define estos 3 crons con su propio trigger (no hace falta tocarlo).

---

## Reglas de esta orden
- No hace falta agregar tests nuevos si no los había, pero si tocás un archivo que ya tiene test (`.test.ts`), correlo y ajustalo si el fix cambia el comportamiento esperado.
- `npm run typecheck` limpio antes de commitear. Correr `npm run lint` también si es rápido.
- Actualizar `TAREAS/REPORTE_DE_CAMBIOS.md` (detalle) y `TAREAS/REPORTELIDER.md` (resumen 2-4 líneas) como siempre.
- No escribas "verificado por el Ingeniero Líder" en tu reporte — esa frase la agrego yo después de revisar.
- Commit scoped a los archivos que tocaste (no `git add -A`). Un commit por bug está bien, o los 3 juntos si preferís — a tu criterio.
- Al final: commit + `git push origin main`.
