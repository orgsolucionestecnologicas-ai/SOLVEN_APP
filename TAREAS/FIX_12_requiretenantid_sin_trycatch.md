# FIX-12 — requireTenantId() sin try/catch en subscription y dashboard/summary

## Contexto (hallazgo de TESTS-01, 2026-07-18, verificado en código)

Dos endpoints llaman `requireTenantId()` **fuera** del bloque `try`, a diferencia de todos los demás route handlers del proyecto:

`src/app/api/subscription/route.ts`:
```ts
export async function GET() {
  const tenantId = await requireTenantId();   // <- fuera del try
  try {
    ...
  } catch {
    return errorResponse("No se pudo obtener la suscripción.");
  }
}
```

`src/app/api/dashboard/summary/route.ts`:
```ts
export async function GET() {
  const tenantId = await requireTenantId();   // <- fuera del try
  try {
    ...
  } catch {
    return errorResponse("Could not load dashboard summary.");
  }
}
```

Sin sesión válida, `requireTenantId()` lanza `UnauthorizedError` (`src/lib/tenant.ts`). Como el `await` está fuera del `try`, esa excepción se propaga sin capturar en vez de convertirse en el 401 limpio que devuelve el resto de los endpoints del proyecto (patrón estándar: `try { ({tenantId} = await requireRole(...)) } catch (e) { if (e instanceof UnauthorizedError) return unauthorizedResponse(); ... }`, usado en decenas de otras rutas). En Next.js App Router, una excepción no capturada en un route handler generalmente resulta en una respuesta 500 genérica en vez del 401 esperado.

Ya existe un test que documenta el comportamiento actual (`src/app/api/subscription/route.test.ts`, caso `"propagates UnauthorizedError without a session (route does not catch it — see report)"`) — ese test se va a tener que actualizar como parte de este fix, porque después del cambio el endpoint SÍ debe devolver 401 en vez de propagar la excepción.

## Qué hacer

Para **ambos** archivos (`src/app/api/subscription/route.ts` y `src/app/api/dashboard/summary/route.ts`):

1. Envolver la llamada a `requireTenantId()` en su propio `try/catch`, mismo patrón usado en el resto del proyecto (ejemplo: `src/app/api/reports/export/route.ts` o `src/app/api/quotes/route.ts`, función `GET`):
   ```ts
   let tenantId: string;
   try {
     tenantId = await requireTenantId();
   } catch (e) {
     if (e instanceof UnauthorizedError) return unauthorizedResponse();
     throw e;
   }
   ```
2. Importar `UnauthorizedError` de `@/lib/tenant` y `unauthorizedResponse` de `../_shared/responses` (o `../../_shared/responses` según la profundidad de carpeta) en ambos archivos — verificar el import relativo correcto en cada uno.
3. El resto de la lógica de cada función (el segundo `try/catch` que ya envuelve la query a Prisma) no cambia.

## Restricciones estrictas
- No tocar ninguna otra lógica de estos 2 archivos (el cálculo de `daysLeft` en `subscription`, ni `getDashboardSummary` en `dashboard`).
- No tocar ningún otro endpoint — el hallazgo original de TESTS-01 solo identificó estos 2, no hacer un barrido especulativo de "por si hay más" en esta orden.
- Actualizar el test existente `src/app/api/subscription/route.test.ts` (el caso que hoy espera `rejects.toBeInstanceOf(UnauthorizedError)` debe pasar a esperar `response.status === 401`, igual que el resto de los tests 401 del proyecto). Si `dashboard/summary` tiene test hoy, revisar si necesita el mismo ajuste (si no tiene test, no es parte de esta orden crear uno nuevo — ya está fuera del alcance de TESTS-01 y de este fix).

## Archivos afectados (esperados)
- `src/app/api/subscription/route.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/app/api/subscription/route.test.ts` (ajuste del caso existente)

## Protocolo de reporte
1. `npm run typecheck` y `npm run lint` sin errores.
2. `npm test` sin regresiones (reportar cuántos passed).
3. Commit + `git push origin main`.
4. Agregar entrada a `TAREAS/REPORTE_DE_CAMBIOS.md` con el detalle técnico completo.
5. Agregar entrada corta (2-4 líneas) a `TAREAS/REPORTELIDER.md` (NO borrar el archivo, solo agregar al final).
6. Entregable breve en el chat.
