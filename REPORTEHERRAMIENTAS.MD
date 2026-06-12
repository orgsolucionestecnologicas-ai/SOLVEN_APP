# REPORTE HERRAMIENTAS — Batch 6 (Credenciales + Sentry + ARCA-11 Docs)

## Tareas completadas
- Tarea 1: saneado `.env.production.example` — reemplazadas credenciales reales por placeholders y agregadas variables de Sentry/ARCA
- Tarea 2: integración de Sentry — instalado `@sentry/nextjs`, creados `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `src/app/global-error.tsx`, actualizado `next.config.mjs` con `withSentryConfig`, y `.gitignore` con entradas de Sentry
- Tarea 3 (ARCA-11): creado template de QA `docs/arca-qa-results.md`

## Validación
- npm run lint: OK
- npm run typecheck: OK (se ajustó el tipo `headers` en `instrumentation.ts` para coincidir con `RequestInfo` de @sentry/nextjs)
- npx prisma validate: OK
- npm test: 198 tests / 39 archivos — todos OK

## Notas
- Sentry no inicializa sin `NEXT_PUBLIC_SENTRY_DSN` (enabled: Boolean(dsn)) — no afecta build ni tests.
- Pendiente para Diego (manual, fuera de este batch): rotar password en Neon, actualizar variables en Vercel, crear proyecto en sentry.io y cargar sus variables, y completar QA en `docs/arca-qa-results.md`.
