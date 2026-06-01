# REPORTE — T14+T23+T26
## Estado: COMPLETADO
## Migraciones corridas:
- 20260528020000_add_subscription — agrega SubscriptionStatus enum y modelo Subscription

## Archivos creados:
- prisma/migrations/20260528020000_add_subscription/migration.sql
- src/lib/email.ts — sendWelcomeEmail, sendTrialEndingEmail, sendPaymentFailedEmail, sendCancellationEmail (Resend)
- src/app/api/webhooks/rebill/route.ts — POST webhook con verificación HMAC, maneja 5 tipos de eventos
- src/app/api/subscription/route.ts — GET /api/subscription devuelve status, trialEndsAt, daysLeft
- src/app/suscripcion-vencida/page.tsx — página con CTA de renovación y logout
- ENV_VARS.md — documentación de las 4 variables necesarias

## Archivos modificados:
- prisma/schema.prisma — SubscriptionStatus enum, Subscription model, relación en Tenant
- src/lib/auth.ts — SessionPayload incluye subscriptionStatus y trialEndsAt
- src/app/api/auth/login/route.ts — lee Subscription del tenant y la incluye en el token
- src/app/api/auth/register/route.ts — crea Subscription TRIAL+14 días al registrar
- src/middleware.ts — bloquea CANCELLED/EXPIRED → /suscripcion-vencida; detecta TRIAL vencido
- src/app/ui/app-shell.tsx — SubscriptionBanner: amarillo si ≤7 días trial, rojo si PAST_DUE
- .env — agrega 4 variables de entorno vacías para configurar

## Tests: 179 pasando
## Observaciones:
- Commit: 79ca909 feat: add subscriptions, Rebill webhook, trial banner and transactional emails
- Lint y typecheck limpios
- La verificación de suscripción en middleware usa el JWT (sin Prisma en edge)
- Si RESEND_API_KEY no está configurada, los emails logean warning y no fallan
- Si REBILL_WEBHOOK_SECRET no está configurado, el webhook acepta todo (modo dev)
- Diego debe completar las 4 variables de ENV_VARS.md con valores del dashboard de Rebill/Resend
