# SOLVEN — Master Context for AI Agents

> Este archivo es la fuente de verdad para cualquier agente IA trabajando en SOLVEN.
> Fecha de actualización: 2026-06-14 | Commit base: faebc39

---

## 1. PRODUCTO

SOLVEN es un SaaS de control de negocio para comercios minoristas físicos pequeños y medianos en Argentina. Integra ventas, gastos, inventario, deudas y caja en un solo sistema. El objetivo no es almacenar datos — es darle al dueño claridad, control y mejores decisiones en tiempo real.

**NO es un ERP. NO es corporativo. Simple, estable, usado a diario.**

- Precio: ARS 15.999/mes | Trial: 14 días (tarjeta requerida)
- Mercado: Argentina exclusivamente
- Moneda: ARS exclusivamente — NUNCA usar otra moneda
- URL producción: https://solven-app-484v.vercel.app
- Repo: github.com/orgsolucionestecnologicas-ai/SOLVEN_APP (branch: main)
- Deploy: Vercel — auto-deploy en push a main

---

## 2. STACK

```
Framework:  Next.js 15.5 (App Router) + TypeScript strict
Styling:    Tailwind CSS 3.4
ORM:        Prisma 5.22
Database:   PostgreSQL / Neon (serverless)
Deploy:     Vercel
Tests:      Vitest 3.2
Emails:     Resend
Pagos/Sub:  Rebill (webhooks)
Factura:    ARCA / AFIP (WSAA + WSFE)
AI:         Anthropic SDK @0.96 (claude-haiku-4-5-20251001) — solo NOA ventas
Monitoring: Sentry @10.57 (inactivo — ver sección 8)
```

---

## 3. ARQUITECTURA

### Multi-tenancy
Implementado 100% por código — **sin Row-Level Security en Postgres**.
**TODOS los queries Prisma deben tener `where: { tenantId }`**. Sin excepción.

### Auth
- JWT custom, cookie `solven_session` (httpOnly, secure)
- Firmada con `SOLVEN_SESSION_SECRET`
- Funciones: `verifySession()` / `getSession()` en `src/lib/auth.ts`
- Errores: usar siempre `ForbiddenError` / `UnauthorizedError` de `src/lib/tenant.ts`
- **NUNCA usar `new Error()` genérico para errores de auth**

### Roles (enum UserRole en schema)
`OWNER` | `CASHIER` | `INVENTORY` | `READONLY`
**❌ NO existe el rol ADMIN — no crearlo, no usarlo**

### Estructura de carpetas clave
```
src/
  app/
    api/           → Route handlers (Next.js)
      noa/         → POST /api/noa (NOA ventas, landing page, público)
      invoices/    → ARCA emission
      webhooks/rebill/ → Rebill webhook
      cron/expire-quotes/ → Vercel cron
    ui/            → Componentes de UI compartidos (app-shell, pos, etc.)
  components/
    noa/           → NoaChat.tsx (landing page — único NOA activo)
  lib/
    auth.ts        → verifySession, getSession
    tenant.ts      → requireRole, ForbiddenError, UnauthorizedError
    prisma.ts      → Prisma client singleton
    email.ts       → Resend — 6 emails transaccionales
    noa-prompt.ts  → System prompt NOA ventas
    noa-storage.ts → localStorage session NOA ventas
    arca/          → WSAA + WSFE implementation
    help-knowledge-base.ts → VACÍO (centro de ayuda removido — fase 2)
    help-search.ts → VACÍO (removido — fase 2)
  modules/         → Business logic por dominio
    audit/         → AuditLog module
    quotes/        → Cotizaciones (con expireOverdueQuotes)
    returns/       → Devoluciones
    services/      → Servicios
    [otros]
prisma/
  schema.prisma    → 24+ modelos, fuente de verdad del schema
```

---

## 4. REGLAS ABSOLUTAS — NO NEGOCIABLES

```
✅ Color primario: #7c3aed (violet-600) — SAGRADO, jamás cambiarlo
✅ Naranja (#E85D04 / orange-*): SOLO para status PAST_DUE de suscripción
✅ Excepción: naranja (#f97316) también permitido para la serie de "gastos" en gráficos combinados (ej. dashboard) — uso puramente de visualización de datos, no de estado de suscripción
✅ IVA siempre como fracción: 0 | 0.105 | 0.21 | 0.27 — NUNCA como entero
✅ ARCA es opt-in por tenant Y por venta — Sale.cae es nullable, NUNCA obligatorio
✅ Moneda: ARS exclusivamente — NUNCA RD$, USD, ITBIS, ni otra
✅ Todos los queries Prisma con tenantId scope
✅ Auth errors: ForbiddenError / UnauthorizedError de src/lib/tenant.ts
✅ Totales de venta: calculados en backend, nunca confiar en el cliente
✅ Operaciones financieras: atómicas con transacciones Prisma
✅ NO trabajar en VENTO ni HERMETIC (proyectos archivados indefinidamente)
✅ .env con credenciales reales: NO leer, NO modificar, NO commitear — informar a Diego
✅ NOA existe SOLO en la landing page — NO hay NOA interno en la app
```

---

## 5. BUGS CONOCIDOS (sin corregir)

| Bug | Archivo | Fix |
|-----|---------|-----|
| ~~`requireRole(["OWNER", "ADMIN", "CASHIER"])` — ADMIN no existe~~ | ~~`src/app/api/invoices/route.ts`~~ | ✅ CORREGIDO 2026-06-14 |
| `Service.ivaRate` no existe en schema — hardcodeado `0.21` en 3 lugares | `prisma/schema.prisma:388` + `pos.tsx:813` + `sale-data-access.ts:338` + `quote-data-access.ts:291` | Agregar campo + migración + UI |
| Cron bloqueado por middleware sin cookie + sin CRON_SECRET | `src/app/api/cron/expire-quotes/route.ts` | ✅ Middleware corregido (cron es público) — falta CRON_SECRET en Vercel |
| `/api/invoices` confía en payload del cliente y no valida `saleId` por tenant | `src/modules/invoices/invoice-data-access.ts:37,81` | Refactorizar para leer venta desde DB con `tenantId` |
| `sendQuoteExpiringReminderEmail` no se llama desde ningún lugar | `src/lib/email.ts:189` | Conectar al cron o a un trigger de cotizaciones |
| Rebill acepta cualquier firma si falta `REBILL_WEBHOOK_SECRET` | `src/app/api/webhooks/rebill/route.ts:10` | Agregar `REBILL_WEBHOOK_SECRET` en Vercel como obligatorio |

---

## 6. MODELOS PRISMA (24+ modelos)

```
Tenant, User, StoreSettings, Subscription
Product, Category, Subcategory, Service
Sale, SaleItem, Return, ReturnItem
Expense, Customer, Debt, DebtPayment
CashMovement, CashRegisterSession, InventoryMovement
Promotion, PromotionUsage
Quote, QuoteItem
CodeCounter, AuditLog
TenantARCAConfig, ARCATokenCache, Invoice
```

**Campos críticos:**
- `Sale.cae String?` — nullable (ARCA opt-in)
- `SaleItem.ivaRate Float @default(0.21)` — fracción
- `Product.ivaRate Float @default(0.21)` — fracción
- `Service` — **NO tiene ivaRate** (bug conocido)
- `UserRole` enum: `OWNER | CASHIER | INVENTORY | READONLY`

---

## 7. NOA — ÚNICO SISTEMA ACTIVO (ventas / landing page)

```
Endpoint:   POST /api/noa  (SIN auth — público)
Componente: src/components/noa/NoaChat.tsx
Motor:      Claude Haiku vía Anthropic API (streaming)
Propósito:  Convertir visitantes en clientes → trial 14 días
Estado:     ✅ FUNCIONA
```

**NOA interno fue removido del proyecto.** No hay asistente IA dentro de la app.
La página `/ayuda` y el centro de ayuda estático también fueron removidos — **se rediseñarán en fase 2**.

---

## 8. INTEGRACIONES EXTERNAS

### Rebill (suscripciones)
- Webhook: `POST /api/webhooks/rebill` — HMAC-SHA256 con `REBILL_WEBHOOK_SECRET`
- 5 eventos: `subscription.activated`, `payment.success`, `payment.failed`, `subscription.cancelled`, `subscription.trial_will_end`
- Conectado a modelo `Subscription` + emails de Resend
- `REBILL_API_KEY` está en .env pero **no se usa en el código actualmente**

### Resend (emails)
- 6 emails transaccionales en `src/lib/email.ts`
- FROM: `SOLVEN <no-reply@solven.app>`
- sendWelcomeEmail, sendTrialEndingEmail, sendPaymentFailedEmail, sendCancellationEmail, sendQuoteEmail, sendQuoteExpiringReminderEmail

### ARCA/AFIP (facturación electrónica)
- Implementación completa: `src/lib/arca/` (wsaa-client, wsfe-client, cert-crypto, token-cache, voucher-builder)
- Opt-in por tenant (`TenantARCAConfig`) y por venta (`Sale.cae nullable`)
- Config endpoint: `POST /api/tenants/arca-config`
- Emisión: `POST /api/invoices` (tiene bug de ADMIN — ver sección 5)

### Vercel Cron
- `GET /api/cron/expire-quotes` — diario a las 3am UTC
- Definido en `vercel.json`
- **Desprotegido si CRON_SECRET no está en env** (ver bug sección 5)

### Sentry (monitoring)
- Instalado pero **INACTIVO** — falta `NEXT_PUBLIC_SENTRY_DSN` en env
- Se activa sin cambio de código si se agrega la variable

### Anthropic
- SDK instalado: `@anthropic-ai/sdk ^0.96.0`
- Modelo: `claude-haiku-4-5-20251001`
- Usado exclusivamente en NOA ventas (landing page)

---

## 9. VARIABLES DE ENTORNO

### Presentes en .env
`DATABASE_URL` | `SOLVEN_USER` | `SOLVEN_PASSWORD` | `SOLVEN_SESSION_SECRET`
`REBILL_WEBHOOK_SECRET` | `REBILL_API_KEY` (sin uso en código)
`RESEND_API_KEY` | `NEXT_PUBLIC_REBILL_CHECKOUT_URL`

### Presentes en .env.local
`ANTHROPIC_API_KEY` | `ARCA_CERT_ENCRYPTION_KEY` | `ARCA_ENVIRONMENT`

### FALTANTES en Vercel (configurar manualmente)
```
CRON_SECRET               🔴 CRÍTICA — endpoint desprotegido sin esto
NEXT_PUBLIC_APP_URL       🟡 Para links en emails y URLs absolutas
ANTHROPIC_API_KEY         🟡 Necesaria en producción para NOA ventas
NEXT_PUBLIC_SENTRY_DSN    🟢 Para activar monitoring
SENTRY_ORG                🟢 Source maps
SENTRY_PROJECT            🟢 Source maps
SENTRY_AUTH_TOKEN         🟢 Source maps
```

### ALERTA DE SEGURIDAD
`.env.production.example` contiene credenciales reales de Neon DB.
Diego debe rotarlas manualmente. NUNCA leer, NUNCA commitear este archivo.

---

## 10. PÁGINAS Y RUTAS

### Públicas (sin auth) — declaradas en `src/middleware.ts`
`/` `/pricing` `/login` `/register` `/onboarding` `/suscripcion-vencida`
`/api/noa` (NOA ventas — streaming público)
`/api/auth/*` `/api/webhooks/*` `/api/cron/*`

### App (requieren auth)
`/dashboard` `/pos` `/products` `/products/new` `/products/[id]`
`/services` `/inventory` `/inventory/adjust` `/inventory/entry`
`/customers` `/customers/new` `/customers/[id]` `/customers/[id]/payment`
`/debts` `/expenses` `/sales` `/returns`
`/promotions` `/quotes` `/cash-movements` `/cash-movements/new`
`/reports` `/settings` `/usuarios` `/cuenta`
`/suscripcion-vencida`
> `/ayuda` — removida, se rediseña en fase 2

---

## 11. PRIORIDADES ACTUALES (2026-06-14)

```
✅ Fix bug ADMIN en /api/invoices/route.ts → corregido 2026-06-14
✅ /api/noa, /pricing, /onboarding, /api/cron/* declarados públicos en middleware
P1: Agregar CRON_SECRET en Vercel (protección interna del endpoint)
P1: Agregar REBILL_WEBHOOK_SECRET en Vercel (critico — sin él acepta cualquier firma)
P1: Corregir ARCA — validar saleId por tenantId antes de emitir; recalcular items desde DB
P2: Agregar Service.ivaRate al schema (migración + UI + 3 lugares hardcodeados)
P2: Configurar NEXT_PUBLIC_APP_URL y ANTHROPIC_API_KEY en Vercel
P2: Conectar sendQuoteExpiringReminderEmail desde cron o trigger de cotizaciones
P3: Activar Sentry (agregar DSN en Vercel)
P3: Agregar tests para: quotes, reports, users, settings, subscription, invoices, webhooks
```

---

## 12. CONVENCIONES DE CÓDIGO

- **Errores API:** usar helpers de `src/app/api/_shared/responses.ts` (successResponse, errorResponse, forbiddenResponse, unauthorizedResponse)
- **Tests:** Vitest — correr `npm run lint && npm run typecheck && npm test` antes de cada commit
- **Commits:** `feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`
- **No RLS:** todo el aislamiento de tenants es por código — revisar SIEMPRE
- **Financiero:** valores monetarios en ARS, nunca float aritmético para dinero, operaciones atómicas
