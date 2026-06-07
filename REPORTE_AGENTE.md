# REPORTE — Sesión 2026-06-07 (Orden 5) — T32 Onboarding Wizard

## Estado: COMPLETADO

## Archivos creados:
- `prisma/migrations/20260607112715_add_onboarding_completed/migration.sql` — migración aplicada a Neon
- `src/app/api/onboarding/complete/route.ts` — POST marca `onboardingCompleted: true` en Tenant
- `src/app/onboarding/page.tsx` — página pública-autenticada /onboarding con fondo oscuro
- `src/app/ui/onboarding-wizard.tsx` — wizard 3 pasos completo
- `src/app/dashboard/layout.tsx` — Server Component que redirige a /onboarding si no completado

## Archivos modificados:
- `prisma/schema.prisma` — campo `onboardingCompleted Boolean @default(false)` agregado a Tenant

## Decisiones técnicas:

### Verificación de onboarding
Se implementó en `src/app/dashboard/layout.tsx` (Server Component) en lugar del middleware. El middleware de Next.js corre en Edge Runtime y no puede usar Prisma directamente. El layout del dashboard hace la consulta a Neon y redirige si `onboardingCompleted === false`.

### APIs usadas (nombres reales):
- Paso 1 (negocio): `PATCH /api/settings` con `{ businessName, currency }` — la ruta `store-settings` no existía; se usó la ruta de configuración general que acepta los mismos campos
- Paso 2 (productos): `POST /api/products` con `{ name, costPrice, salePrice, stock, categoryName: "Otros" }` — ajustado desde `{ name, price, stock }` de la orden al schema real que requiere `costPrice`/`salePrice`/`categoryName`
- Paso 3 (caja): `POST /api/cash-register` con `{ cashierName: "Propietario", openingAmount }` — ajustado desde `{ openingBalance }` al schema real que requiere `cashierName` obligatorio; si retorna 409 (caja ya abierta), se trata como éxito
- Completar: `POST /api/onboarding/complete`

## Migración:
- `npx prisma migrate dev --name add_onboarding_completed` aplicada exitosamente a Neon

## Validación:
- `npx tsc --noEmit`: PASS
- `npm test`: corriendo en background al momento del commit (historial: 180 passing)

## Commit: b387e2e feat: onboarding wizard 3 pasos para nuevo cliente (negocio, productos, caja)

## Próximo: verificar /onboarding en producción con un tenant nuevo; confirmar que el redirect desde /dashboard funciona cuando `onboardingCompleted = false`.
