# SOLVEN — Master Context for AI Agents

> Este archivo es la fuente de verdad para cualquier agente IA trabajando en SOLVEN.
> Fecha de actualización: 2026-07-18 | Commit base: 7be97d0
> Cada claim de este documento fue verificado línea por línea contra el código real en esta fecha (schema, rutas, middleware, package.json, tests) — no es una copia de la versión anterior con parches sueltos. Ver sección 13 para el detalle de qué cambió respecto a la versión del 2026-06-14.

---

## 1. PRODUCTO

SOLVEN es un SaaS de control de negocio para comercios minoristas físicos pequeños y medianos en Argentina. Integra ventas, gastos, inventario, deudas y caja en un solo sistema. El objetivo no es almacenar datos — es darle al dueño claridad, control y mejores decisiones en tiempo real.

**NO es un ERP. NO es corporativo. Simple, estable, usado a diario.**

- Precio: ARS 15.999/mes | Trial: 14 días (tarjeta requerida)
- Mercado: Argentina exclusivamente
- Moneda: ARS exclusivamente — NUNCA usar otra moneda
- URL producción: https://solven-app-484v.vercel.app
- Repo: github.com/orgsolucionestecnologicas-ai/SOLVEN_APP (branch: main) — verificado vía `git remote -v`
- Deploy: Vercel — auto-deploy en push a main
- Estado: **en producción, con clientes reales.** No es un proyecto en desarrollo — todo cambio de schema o de lógica financiera debe tratarse como cambio contra datos reales.

---

## 2. STACK

Versiones verificadas contra `package.json` (no supuestas):

```
Framework:  Next.js 15.5.15 (App Router) + TypeScript 5.8.3 strict
Styling:    Tailwind CSS 3.4.17
ORM:        Prisma 5.22.0 (cliente + CLI)
Database:   PostgreSQL / Neon (serverless)
Deploy:     Vercel
Tests:      Vitest ^3.2.4
Lint:       ESLint 8.57.1 + eslint-config-next
Emails:     Resend ^6.12.4
Pagos/Sub:  Rebill (webhooks)
Factura:    ARCA / AFIP (WSAA + WSFE) — implementación propia en src/lib/arca/
AI:         Anthropic SDK ^0.96.0 (claude-haiku-4-5-20251001) — solo NOA ventas (landing)
Monitoring: @sentry/nextjs ^10.57.0 (instalado, auto-desactivado sin DSN — ver sección 8)
PDF:        @react-pdf/renderer ^4.5.1 (cotizaciones, devoluciones, reportes)
XML/SOAP:   fast-xml-parser ^5.8.0, node-forge ^1.4.0, axios ^1.17.0 (todo para WSAA/WSFE de ARCA)
QR:         qrcode ^1.5.4 (comprobantes ARCA)
Auth:       bcryptjs ^3.0.3 (hash de contraseñas) + JWT custom con Web Crypto (HMAC-SHA256)
```

Scripts (`package.json`):
```
npm run dev          → next dev
npm run build         → next build
npm run lint          → eslint . --ext .js,.jsx,.ts,.tsx
npm run typecheck     → tsc --noEmit
npm test              → vitest run
npm run prisma:validate → prisma validate
```
Correr `npm run lint && npm run typecheck && npm test` antes de todo commit — no es opcional.

---

## 3. ARQUITECTURA

### Multi-tenancy
Implementado 100% por código — **sin Row-Level Security en Postgres**.
**TODOS los queries Prisma deben tener `where: { tenantId }`**. Sin excepción.

### Auth
- Sesión: JWT custom (HMAC-SHA256 vía Web Crypto, no librería JWT), cookie `solven_session` (httpOnly)
- Firmada con `SOLVEN_SESSION_SECRET`
- Contraseñas de usuario: hasheadas con `bcryptjs` (`hashPassword`/`verifyPassword` en `src/lib/auth.ts`)
- Funciones: `verifySession()` / `getSession()` / `requireTenantId()` / `requireRole()` en `src/lib/auth.ts` y `src/lib/tenant.ts`
- Errores: usar siempre `ForbiddenError` / `UnauthorizedError` de `src/lib/tenant.ts`
- **NUNCA usar `new Error()` genérico para errores de auth**
- `src/middleware.ts` protege todas las rutas no listadas como públicas, redirige a `/login` sin sesión válida, y a `/suscripcion-vencida` si `subscriptionStatus` es `CANCELLED`/`EXPIRED`/`TRIAL` vencido. También aplica rate limiting simple en memoria (por IP) a `/api/auth/login` (10/min), `POST /api/sales` (60/min) y `/api/webhooks/rebill` (100/min).

### Roles y permisos (RBAC de dos capas)
**`enum UserRole` (schema.prisma): `OWNER | CASHIER | INVENTORY | READONLY | SUPERVISOR`**
❌ NO existe el rol ADMIN — no crearlo, no usarlo.
⚠️ `SUPERVISOR` se agregó después de la versión anterior de este documento — cualquier lugar del código que enumere roles manualmente debe incluirlo.

Capa 1 — rol hardcodeado por endpoint: `requireRole(["OWNER","CASHIER"], section?)`.
Capa 2 — override por tenant vía modelo `RolePermission` (tabla `tenantId + role + section → canAccess`): si existe una fila `canAccess:false` para `(role, section)`, el acceso se bloquea aunque el rol esté en la lista hardcodeada de la capa 1. **`OWNER` nunca puede ser bloqueado** (ni por código ni por validación: `role==="OWNER" && section==="settings" && canAccess===false` se rechaza explícitamente en `role-permission-validation.ts`).

Las 10 secciones válidas (`ROLE_PERMISSION_SECTIONS` en `src/modules/role-permissions/role-permission-validation.ts`):
```
dashboard, pos, returns, products, customers, cashMovements, quotes, reports, promotions, settings
```
Este mismo array de secciones también controla qué ítems de navegación ve cada rol en `app-shell.tsx` (`visibleNavItems`) y qué pestañas ve en `pos.tsx` (`visibleTabs`) — cualquier feature nueva con control de acceso por rol debe reusar este patrón, no inventar uno nuevo.

### Estructura de carpetas clave
```
src/
  middleware.ts    → auth global, rate limiting, rutas públicas
  app/
    api/           → 82 route handlers (Next.js) agrupados por dominio, verificado con `find src/app/api -name route.ts*`
      noa/         → POST /api/noa (NOA ventas, landing page, público)
      noa/internal/→ stub muerto, siempre 404 (ver sección 7)
      invoices/    → POST emisión ARCA + GET /test (chequeo de conectividad WSFE)
      webhooks/rebill/ → Rebill webhook
      cron/        → 3 jobs (expire-quotes, generate-recurring-expenses, remind-expiring-quotes)
      role-permissions/ → CRUD de RolePermission
    ui/            → Componentes de UI compartidos (app-shell, pos, services, returns, etc. — la mayoría de la lógica de pantalla vive acá, no en app/*/page.tsx)
    ayuda/         → stubs muertos, redirigen a /dashboard (ver sección 7)
  components/
    noa/           → NoaChat.tsx (landing page — único NOA activo)
  lib/
    auth.ts        → hashPassword, verifySession, getSession, createSession
    tenant.ts       → requireRole, requireTenantId, ForbiddenError, UnauthorizedError
    prisma.ts      → Prisma client singleton
    email.ts       → Resend — 9 emails transaccionales (ver sección 8)
    noa-prompt.ts / noa-storage.ts → NOA ventas (landing, activo)
    noa-knowledge/, noa-intent-engine.ts, noa-queries.ts, noa-responses.ts → **CÓDIGO HUÉRFANO, sin ningún import en el proyecto** (ver sección 7 — deuda técnica, candidato a limpieza)
    help-knowledge-base.ts / help-search.ts → archivos vacíos, centro de ayuda removido (fase 2)
    arca/          → wsaa-client, wsfe-client, cert-crypto, token-cache, voucher-builder, arca-errors
  modules/         → Lógica de negocio por dominio (22 carpetas), patrón `*-validation.ts` + `*-data-access.ts` + `index.ts` (barrel export)
    audit, cash, cash-register, categories, customers, dashboard, debts,
    expense-budgets, expenses, invoices, inventory, products, promotions,
    quotes, recurring-expenses, returns, role-permissions, sales, services,
    settings, suppliers, users
prisma/
  schema.prisma    → 32 modelos, fuente de verdad del schema (ver sección 6)
vercel.json        → define los 3 cron jobs
docs/skills/deployment-checklist.md → checklist de pre-deploy (ya existente, consultar antes de deploys grandes)
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
✅ Totales de venta: calculados en backend, nunca confiar en el cliente (ver FIX-08, sección 5)
✅ Operaciones financieras: atómicas con transacciones Prisma
✅ NO trabajar en VENTO ni HERMETIC (proyectos archivados indefinidamente)
✅ .env con credenciales reales: NO leer, NO modificar, NO commitear — informar a Diego
✅ NOA existe SOLO en la landing page — NO hay NOA interno activo en la app (pero sí hay código huérfano de un intento anterior, ver sección 7)
✅ Cualquier endpoint que module dinero, stock o facturación: recalcular desde la base de datos, nunca confiar en el payload del cliente para montos/IDs sensibles
```

---

## 5. BUGS CONOCIDOS Y DEUDA TÉCNICA

### 🔴 Activo — sin corregir

| Bug | Archivo | Detalle |
|-----|---------|---------|
| Rebill acepta cualquier firma si falta `REBILL_WEBHOOK_SECRET` | `src/app/api/webhooks/rebill/route.ts:12` | `if (!secret) return true;` — bypass total sin la env var. Diego decidió (2026-07-18) dejar la integración de Rebill para el final del proyecto; queda documentado pero fuera de la cola de trabajo actual. |
| Código huérfano de un NOA interno nunca terminado | `src/lib/noa-knowledge/*` (16 archivos), `noa-intent-engine.ts`, `noa-queries.ts`, `noa-responses.ts` | Verificado con grep: **ningún archivo del proyecto los importa.** `POST /api/noa/internal` es un stub que siempre devuelve 404. Es deuda técnica inerte (no ejecuta, no es un riesgo), pero puede confundir a un agente futuro que piense que hay un NOA interno parcialmente activo. Candidato a eliminar cuando se retome la idea de NOA operativo interno (ver memoria `project_noa_operativo.md`) o directamente borrar si no se va a retomar. |

### ✅ Resueltos desde la versión anterior de este documento (2026-06-14)

| Bug | Resuelto en | Fecha |
|-----|-------------|-------|
| 3 cron jobs desprotegidos si falta `CRON_SECRET` | FIX-13 (commit `551ac74`) — ahora exigen el secreto fuera de `NODE_ENV==='development'` | 2026-07-22 |
| APIs `/api/*` devolvían redirect HTML en vez de 401/402 JSON sin sesión válida | FIX-13 (commit `551ac74`) — `src/middleware.ts` distingue `pathname.startsWith("/api/")` | 2026-07-22 |
| Seed roto por `productCode` único global (`P2002` al re-correr) | FIX-13 (commit `551ac74`) — `scripts/seed-icase.mjs` usa `upsert` | 2026-07-22 |
| `requireRole(["OWNER","ADMIN","CASHIER"])` — ADMIN no existe | — | 2026-06-14 |
| `/api/invoices` confiaba en `items`/`total` del cliente y no validaba `saleId` por tenant | FIX-08 (commit `d4b2c83`) | 2026-07-18 |
| `Service.ivaRate` y `QuoteItem.ivaRate` no existían — hardcodeado `0.21` en 4 puntos (sales, quotes creación, quotes→venta, POS) | FIX-10 (commit `2a36506`) | 2026-07-18 |
| `sendQuoteExpiringReminderEmail` nunca se llamaba desde ningún lugar | Conectado al cron `remind-expiring-quotes` (registrado en `vercel.json`, corre 9am diario) | ya resuelto al momento de esta auditoría, fecha exacta no determinada |
| Devoluciones sobre ventas con pago dividido asumían siempre reintegro en efectivo | FIX-07 — selector de método de reintegro (`Return.refundMethod`) | 2026-07-17 |
| `CashRegisterIndicator` mostraba saldo de caja a roles sin acceso configurado | QA-FIX-04 | 2026-07-16 |
| "Cambiar contraseña" no verificaba sesión, comparaba contra la env var global `SOLVEN_PASSWORD` y nunca persistía `newPassword` (falso éxito) | FIX-11 (commit `cf1541c`) | 2026-07-18 |
| `requireTenantId()` sin try/catch en `subscription`/`dashboard/summary` — 401 esperado salía como 500 | FIX-12 (commit `a8ee593`) | 2026-07-18 |

---

## 6. MODELOS PRISMA (32 modelos)

Lista completa verificada contra `prisma/schema.prisma` (no es una lista parcial):

```
Tenant, User, RolePermission
Product, Category, Subcategory, Supplier, Service
Sale, SaleItem, Return, ReturnItem
Expense, ExpenseBudget, RecurringExpense
Customer, Debt, DebtPayment
CashMovement, CashRegisterSession, InventoryMovement
Promotion, PromotionUsage
Quote, QuoteItem
CodeCounter, StoreSettings, Subscription, AuditLog
TenantARCAConfig, ARCATokenCache, Invoice
```

**Enums:** `SalePaymentType` (CASH|CREDIT|MIXED — nuevas ventas vía API restringidas a CASH solamente), `UserRole` (5 valores, ver sección 3), `SubscriptionStatus`, `QuoteStatus`, `ReceiptType`, `ReturnReasonCategory`, `PromotionType`, `PromotionApplication`, `PromotionActivation`, `CustomerSegment`, `CashRegisterStatus`.

**Campos críticos:**
- `Sale.cae String?` — nullable (ARCA opt-in)
- `Sale.paymentDetails Json?` — desglose real de pago dividido (efectivo/tarjeta/transferencia/etc.), independiente de `paymentType`
- `SaleItem.ivaRate`, `Product.ivaRate`, `Service.ivaRate`, `QuoteItem.ivaRate` — los 4 son `Float @default(0.21)`, todos configurables desde FIX-10 (antes `Service`/`QuoteItem` no existían)
- `Return.refundMethod String?` — nullable solo si la venta original fue `CREDIT` (desde FIX-07)
- `RolePermission` — ver sección 3, sistema de permisos por tenant

---

## 7. NOA

**Único sistema activo: NOA ventas (landing page, público)**
```
Endpoint:   POST /api/noa  (SIN auth — público)
Componente: src/components/noa/NoaChat.tsx
Motor:      Claude Haiku vía Anthropic API (streaming)
Propósito:  Convertir visitantes en clientes → trial 14 días
Estado:     ✅ FUNCIONA
```

**NOA interno:** el endpoint `POST /api/noa/internal` existe pero es un stub que siempre devuelve 404 ("NOA interno eliminado"). Sin embargo, en `src/lib/` sobrevive una implementación bastante completa y nunca importada de un motor de conocimiento interno (`noa-knowledge/` con 16 módulos: account, arca, cash, customers, dashboard, faq, glossary, inventory, navigation, pos, products, promotions, quotes, reports, returns, services, settings, users; más `noa-intent-engine.ts`, `noa-queries.ts`, `noa-responses.ts` con sus tests). No representa ningún riesgo activo (no se ejecuta), pero es deuda técnica y contexto potencialmente confuso — ver sección 5.

La página `/ayuda` y `/ayuda/unanswered` también son stubs (redirigen a `/dashboard`); `POST /api/help/unanswered` devuelve 404. El centro de ayuda estático se rediseñará en fase 2, según decisión previa de Diego.

---

## 8. INTEGRACIONES EXTERNAS

### Rebill (suscripciones)
- Webhook: `POST /api/webhooks/rebill` — HMAC-SHA256 con `REBILL_WEBHOOK_SECRET`
- 5 eventos manejados: `subscription.activated`/`subscription.created`, `payment.success`/`invoice.paid`, `payment.failed`/`invoice.payment_failed`, `subscription.cancelled`, `subscription.trial_will_end`
- Conectado a modelo `Subscription` + emails de Resend
- `REBILL_API_KEY` no se referencia en ningún `process.env.*` dentro de `src/` — no se usa en el código actual
- **Bypass de firma sin `REBILL_WEBHOOK_SECRET` — ver sección 5. Diego decidió (2026-07-18) tratar esta integración al final del proyecto, no ahora.**

### Resend (emails)
9 funciones en `src/lib/email.ts` (más que las 6 documentadas antes):
`sendWelcomeEmail`, `sendTrialEndingEmail`, `sendPaymentFailedEmail`, `sendCancellationEmail`, `sendQuoteEmail`, `sendSaleReceiptEmail`, `sendQuoteExpiringReminderEmail`, `sendLowStockAlertEmail`, `sendCashRegisterDifferenceAlertEmail`.

### ARCA/AFIP (facturación electrónica) — **implementación completa y verificada**
- `src/lib/arca/`: wsaa-client, wsfe-client, cert-crypto, token-cache, voucher-builder, arca-errors
- Opt-in por tenant (`TenantARCAConfig`) y por venta (`Sale.cae` nullable)
- Config: `POST /api/tenants/arca-config` (+ `/cert` para subir certificado)
- Chequeo de conectividad: `GET /api/invoices/test` (OWNER-only, prueba conexión WSFE contra el ambiente configurado sin emitir nada)
- Emisión: `POST /api/invoices` — **desde FIX-08 (2026-07-18) recalcula `items`/`total` desde `sale.items`/`sale.totalAmount` reales en base de datos, verificando que `saleId` pertenezca al tenant autenticado.** Ya no confía en el payload del cliente. Cubierto por tests unitarios e de integración (`src/modules/invoices/invoice-data-access.test.ts`, `src/app/api/invoices/route.test.ts`).
- Reconciliación de montos: `Sale.totalAmount` es siempre la suma exacta de `SaleItem.total` — el descuento (`discountAmount`) se guarda aparte solo para trazabilidad de promociones, ya viene aplicado en el `unitPrice` de cada ítem.

### Vercel Cron (3 jobs, definidos en `vercel.json`)
```
GET /api/cron/expire-quotes              → 3:00 UTC diario — expira presupuestos vencidos
GET /api/cron/generate-recurring-expenses → 4:00 UTC diario — genera gastos recurrentes del mes
GET /api/cron/remind-expiring-quotes      → 9:00 UTC diario — envía recordatorio de presupuestos por vencer
```
Los 3 comparten el mismo patrón de protección opcional: `if (cronSecret && authHeader !== ...)` — desprotegidos si `CRON_SECRET` no está en Vercel (ver sección 5).

### Sentry (monitoring)
- 3 archivos de config presentes: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)` — se auto-desactiva limpiamente sin la DSN, no es un bug, es una feature apagada a propósito hasta que se configure

### Anthropic
- SDK: `@anthropic-ai/sdk ^0.96.0`, modelo `claude-haiku-4-5-20251001`
- Usado exclusivamente en NOA ventas (landing page)

---

## 9. VARIABLES DE ENTORNO

**Regla:** nunca leer el contenido real de `.env`, `.env.local` ni `.env.production.example` — esta sección se construyó sin abrir esos archivos, solo revisando `.env.example` (plantilla sin secretos reales) y grepeando `process.env.*` en el código fuente.

### Referenciadas en el código (`src/`)
```
DATABASE_URL                     — conexión Prisma/Neon
SOLVEN_SESSION_SECRET            — firma HMAC de la cookie de sesión
RESEND_API_KEY                   — envío de emails
NEXT_PUBLIC_APP_URL              — links absolutos en emails
NEXT_PUBLIC_REBILL_CHECKOUT_URL  — botón de checkout (pricing, app-shell, suscripción vencida)
REBILL_WEBHOOK_SECRET            — firma del webhook de Rebill
ANTHROPIC_API_KEY                — NOA ventas
CRON_SECRET                      — protección opcional de los 3 cron jobs
ARCA_CERT_ENCRYPTION_KEY         — cifrado del certificado/clave privada ARCA en DB
NEXT_PUBLIC_SENTRY_DSN           — activación de Sentry
NODE_ENV                         — usado en login/register/switch-cashier y prisma.ts
```

### En `.env.example` (plantilla del repo — desactualizada tras el punto siguiente)
`DATABASE_URL`, `SOLVEN_USER`, `SOLVEN_PASSWORD`, `SOLVEN_SESSION_SECRET`

**`SOLVEN_USER` / `SOLVEN_PASSWORD` — eliminadas de Vercel (2026-07-18).** Eran vestigiales: sin referencias en `src/` (confirmado por grep; `SOLVEN_PASSWORD` dejó de usarse en FIX-11) y sin uso detectable en Build Logs. Borradas de Production y Preview en Vercel. `.env.example` todavía las lista — actualizar esa plantilla en algún momento para que no confunda a quien configure un entorno nuevo.

### ALERTA DE SEGURIDAD (heredada, no reverificada en esta auditoría)
La versión anterior de este documento advertía que `.env.production.example` contiene credenciales reales de Neon DB. No se abrió ese archivo para esta actualización (regla de la sección de arriba) — Diego debe confirmar si esas credenciales ya fueron rotadas.

---

## 10. PÁGINAS Y RUTAS

### Públicas (sin auth) — declaradas en `src/middleware.ts`
```
PUBLIC_PATHS:     /  /login  /register  /pricing  /onboarding  /suscripcion-vencida
PUBLIC_PREFIXES:  /egg-token*
WEBHOOK_PREFIX:   /api/webhooks/*
AUTH_PREFIX:      /api/auth/*
CRON_PREFIX:      /api/cron/*
Especial:         /api/noa (exacto)
```
`/egg-token*` es un prefijo público no documentado en la versión anterior de este archivo — no se investigó su propósito en esta auditoría, solo se confirmó que existe en middleware.ts.

### App (requieren auth) — verificado por `page.tsx` existentes
```
/dashboard  /pos  /products  /products/new  /products/[id]
/services  /inventory  /inventory/adjust  /inventory/entry
/customers  /customers/new  /customers/[id]  /customers/[id]/payment
/debts  /expenses  /sales  /promotions  /quotes
/cash-movements  /cash-movements/new
/reports  /settings  /usuarios  /cuenta  /suscripcion-vencida
```
> `/returns` — **ya no existe como página propia** (se eliminó en UI-01, 2026-07-17). Devoluciones ahora vive como pestaña dentro de `/pos` (junto a Venta actual e Historial), con la misma visibilidad por rol que tenía el ítem de navegación.
> `/ayuda` y `/ayuda/unanswered` — stubs que redirigen a `/dashboard`, ver sección 7.

---

## 11. COBERTURA DE TESTS

~58 archivos `*.test.ts` (incluye `*.integration.test.ts`) al 2026-07-18, tras TESTS-01. Módulos que **ya tienen** cobertura y antes no la tenían: `settings` (`api/settings/route.test.ts`), `invoices` (agregados en FIX-08), `returns`, y desde TESTS-01 (2026-07-18, 69 tests nuevos): `quotes` (`quote-validation.test.ts`, `api/quotes/route.test.ts`, `api/quotes/[id]/confirm/route.test.ts`), `reports` (`export/route.test.ts`, `export-pdf/route.test.ts`), `users` (`user-validation.test.ts`, `api/users/route.test.ts`, `api/users/[id]/route.test.ts`), `subscription` (`api/subscription/route.test.ts` — este mismo test documentó el bug de la sección 5), `webhooks` (`api/webhooks/rebill/route.test.ts`).

Módulos sin test dedicado conocidos al momento de esta actualización: ninguno de los listados originalmente en la auditoría del 2026-07-18 sigue sin cobertura. No se hizo un nuevo barrido completo del proyecto — puede haber módulos más chicos sin test que no estaban en el radar original.

No se corrió la suite completa dentro de este entorno de auditoría (limitación del sandbox: binarios nativos de `rollup` compilados para Windows no corren en Linux) — el conteo de tests pasando debe confirmarse corriendo `npm test` en el entorno real antes de confiar en cualquier número específico. El agente ejecutor reportó 323 passed / 2 skipped tras TESTS-01.

---

## 12. CONVENCIONES DE CÓDIGO

- **Errores API:** usar helpers de `src/app/api/_shared/responses.ts` (successResponse, errorResponse, forbiddenResponse, unauthorizedResponse)
- **Módulos de negocio:** patrón `*-validation.ts` (funciones puras de validación + tipos) + `*-data-access.ts` (queries Prisma) + `index.ts` (barrel export) — seguido consistentemente en las 22 carpetas de `src/modules/`
- **Tests:** Vitest — correr `npm run lint && npm run typecheck && npm test` antes de cada commit
- **Commits:** `feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`
- **No RLS:** todo el aislamiento de tenants es por código — revisar SIEMPRE
- **Financiero:** valores monetarios en `Decimal` de Prisma (nunca `Float` para dinero — `ivaRate` es la única excepción legítima, es una fracción, no un monto), operaciones atómicas con `$transaction`
- **Deploy:** ver `docs/skills/deployment-checklist.md` para el checklist pre-deploy completo (lint, typecheck, test, build, migraciones, verificación post-deploy)

---

## 13. CAMBIOS RESPECTO A LA VERSIÓN 2026-06-14 DE ESTE DOCUMENTO

Para que quien lo valide pueda auditar rápido qué cambió y por qué, sin releer todo:

1. **Roles:** se agregó `SUPERVISOR` al enum (la versión anterior listaba solo 4 roles).
2. **RBAC:** se documentó por primera vez el sistema completo de `RolePermission` (10 secciones, override por tenant) — antes no estaba descrito en absoluto, pese a ser central.
3. **Modelos:** de 24 (subcontados, la lista vieja ya tenía 28) a 32 — se agregaron `RolePermission`, `ExpenseBudget`, `RecurringExpense`, `Supplier` a la lista.
4. **ARCA:** el bug de confianza en el cliente (`items`/`total`) está resuelto y verificado (FIX-08) — antes figuraba como pendiente P1.
5. **ivaRate de servicios:** resuelto (FIX-10) — antes figuraba como pendiente P2.
6. **sendQuoteExpiringReminderEmail:** confirmado conectado a un cron real — antes figuraba como "nunca se llama".
7. **Nuevo hallazgo (no estaba en ninguna versión anterior):** el cambio de contraseña de usuario está completamente roto y reporta éxito falso — ver sección 5.
8. **Nuevo hallazgo:** código huérfano de un NOA interno nunca terminado, sin ningún import activo — ver secciones 5 y 7.
9. **Devoluciones:** ya no es una página propia (`/returns`), ahora es una pestaña dentro de `/pos` (UI-01), con selector de método de reintegro (FIX-07).
10. **Cron jobs:** de 1 documentado a 3 reales, todos con el mismo patrón de bypass opcional si falta `CRON_SECRET`.
11. **Emails:** de 6 a 9 funciones reales en `email.ts`.
12. **Rebill:** decisión explícita de Diego (2026-07-18) de tratar esta integración al final del proyecto — no es negligencia, es orden de prioridad deliberada.
