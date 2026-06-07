# REPORTE — Sesión 2026-06-07 (Orden 3) — T27 + T35

## Estado: COMPLETADO

## Archivos creados:
- `src/app/api/help/unanswered/route.ts` — POST guarda pregunta sin respuesta en BD; GET lista agrupadas por frecuencia (top 50)
- `src/app/ayuda/unanswered/page.tsx` — vista admin /ayuda/unanswered con AppShell
- `src/app/ui/unanswered-queries.tsx` — componente que lista preguntas sin respuesta ordenadas por count
- `prisma/migrations/20260607105925_add_help_query/migration.sql` — migración aplicada a Neon

## Archivos modificados:
- `src/middleware.ts` — rate limiting in-memory por IP antes de la lógica de sesión: login (10/min), sales POST (60/min), webhooks Rebill (100/min)
- `prisma/schema.prisma` — modelo `HelpQuery` agregado con `tenantId`, `question`, `createdAt`, indexes en ambos campos; relación `helpQueries HelpQuery[]` en Tenant
- `src/components/help/HelpChat.tsx` — cuando `searchHelp` retorna vacío, dispara `fetch("/api/help/unanswered")` fire-and-forget antes de mostrar el mensaje NO_RESULT

## Migración:
- `npx prisma migrate dev --name add_help_query` aplicada exitosamente contra Neon
- Tabla `HelpQuery` creada en producción

## Validación:
- `npx tsc --noEmit`: PASS
- `npm test`: corriendo en background al momento del commit (tests anteriores: 177 passing, 1 falla preexistente de red)

## Commit: 6acd6f8 feat: rate limiting en rutas sensibles, captura de preguntas sin respuesta del asistente

## Observaciones:
- El `rateLimitStore` en memoria se resetea con cada cold start de Vercel — aceptable para escala actual (≤50 tenants)
- Rate limit para login corre ANTES del bypass de rutas públicas, asegurando protección anti-brute-force
- El endpoint GET de `/api/help/unanswered` usa `groupBy` para deduplicar preguntas idénticas

## Próximo: revisar /ayuda/unanswered en producción para confirmar que carga; monitorear si se acumulan preguntas frecuentes para ampliar la KB.
