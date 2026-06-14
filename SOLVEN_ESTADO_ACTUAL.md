# SOLVEN — Estado Actual del Sistema
**Fecha de auditoría:** 2026-06-13  
**Auditado por:** NOA (Claude)  
**Rama auditada:** última HEAD (commit faebc39)  
**Stack:** Next.js 15.5, TypeScript strict, Prisma 5.22, PostgreSQL/Neon, Vercel

---

## RESUMEN EJECUTIVO

SOLVEN es una aplicación SaaS multi-tenant para comercios minoristas argentinos. El 85% del sistema está funcionando. Los tres problemas más críticos identificados son:

1. **NOA Interno no usa IA** — usa matching de palabras clave. Es el origen del problema reportado.
2. **Bug de rol ADMIN** en la ruta de emisión de facturas (`requireRole(["OWNER", "ADMIN", "CASHIER"])` — ADMIN no existe en el schema).
3. **Cron endpoint desprotegido** — si no hay CRON_SECRET en las variables de entorno, cualquiera puede expiriar cotizaciones llamando al endpoint.

---

## 1. ARQUITECTURA GENERAL

```
Internet
   │
   ├── Landing / Ventas
   │   ├── /              (página principal)
   │   ├── /pricing       (planes y precios)
   │   ├── /login
   │   ├── /register
   │   └── /onboarding
   │
   └── App (requiere auth)
       ├── /dashboard
       ├── /pos            (punto de venta)
       ├── /products       + /products/new + /products/[id]
       ├── /services
       ├── /inventory      + /adjust + /entry
       ├── /customers      + /new + /[id] + /[id]/payment
       ├── /debts
       ├── /expenses
       ├── /sales          (historial)
       ├── /returns
       ├── /promotions
       ├── /quotes
       ├── /cash-movements + /new
       ├── /reports
       ├── /settings
       ├── /usuarios
       ├── /cuenta
       ├── /ayuda          + /ayuda/unanswered
       └── /suscripcion-vencida
```

**Multi-tenancy:** implementado 100% por código (sin Row-Level Security en Postgres). Todos los queries tienen `where: { tenantId }`.

**Auth:** JWT custom, cookie `solven_session`, funciones `verifySession()` / `getSession()` en `src/lib/auth.ts`. Sin sesiones en DB.

**Roles:** `OWNER`, `CASHIER`, `INVENTORY`, `READONLY` — NO existe `ADMIN`.

---

## 2. QUÉ ESTÁ FUNCIONANDO ✅

### 2.1 Módulos de negocio

| Módulo | Estado | Notas |
|---|---|---|
| POS (Punto de venta) | ✅ Completo | Soporte de productos, servicios, promociones, clientes |
| Productos | ✅ Completo | CRUD, categorías, subcategorías, ivaRate |
| Servicios | ✅ Completo | CRUD — falta ivaRate en schema (ver sección 3) |
| Inventario | ✅ Completo | Movimientos, ajustes, ingresos |
| Clientes | ✅ Completo | CRUD + historial + pagos de deuda |
| Deudas | ✅ Completo | Registro y cancelación |
| Gastos | ✅ Completo | Registro y visualización |
| Historial de ventas | ✅ Completo | Con filtros |
| Devoluciones | ✅ Completo | Módulo `src/modules/returns/` |
| Cotizaciones | ✅ Completo | Con envío por email y expiración automática |
| Caja / Movimientos | ✅ Completo | Apertura, cierre, movimientos manuales |
| Reportes | ✅ Completo | Página `/reports` |
| Promociones | ✅ Completo | Con registro de uso (`PromotionUsage`) |
| Configuración de tienda | ✅ Completo | `StoreSettings` |
| Usuarios / Roles | ✅ Completo | Gestión por OWNER |
| Auditoría | ✅ Completo | Módulo `src/modules/audit/` + API `/api/audit-logs` |

### 2.2 Integraciones externas

| Integración | Estado | Notas |
|---|---|---|
| **Rebill** (suscripciones) | ✅ Completo | Webhook HMAC-SHA256 en `/api/webhooks/rebill`. 5 eventos manejados: `subscription.activated`, `payment.success`, `payment.failed`, `subscription.cancelled`, `subscription.trial_will_end` |
| **Resend** (email) | ✅ Completo | 6 emails transaccionales implementados (ver 2.3) |
| **ARCA/AFIP** (facturación) | ✅ Completo | WSAA + WSFE implementados. Opt-in por tenant y por venta. `Sale.cae` nullable |
| **Vercel Cron** | ✅ Completo | Corre `/api/cron/expire-quotes` a las 3am UTC (ver bug 3.4) |
| **Sentry** | ⚠️ Instalado, inactivo | SDK instalado, código configurado, pero SENTRY_DSN no está en env. Monitoring APAGADO |

### 2.3 Emails transaccionales (Resend)

Todos implementados en `src/lib/email.ts`, FROM: `SOLVEN <no-reply@solven.app>`:

1. `sendWelcomeEmail` — bienvenida al registrarse
2. `sendTrialEndingEmail` — 3 días antes del fin del trial
3. `sendPaymentFailedEmail` — cuando falla un pago (webhook Rebill)
4. `sendCancellationEmail` — cuando se cancela la suscripción
5. `sendQuoteEmail` — envío de cotización al cliente
6. `sendQuoteExpiringReminderEmail` — recordatorio de cotización por vencer

### 2.4 NOA de ventas (landing page)

Funciona correctamente para su propósito:
- Endpoint: `POST /api/noa` (sin auth)
- Motor: Claude Haiku (`claude-haiku-4-5-20251001`) vía SDK de Anthropic, streaming
- Contexto: nombre y tipo de negocio del visitante (opcional)
- Propósito: convertir visitantes en clientes (trial de 14 días)
- Componente: `src/components/noa/NoaChat.tsx`

### 2.5 NOA interno — queries de datos

Los 28 intents de consulta de datos tienen queries Prisma implementados en `noa-queries.ts`, todos con scoping por `tenantId`. Los datos que puede traer NOA cuando reconoce el intent correcto:

`buscar_ventas`, `buscar_clientes`, `ver_deuda_cliente`, `buscar_productos`, `productos_bajo_stock`, `resumen_negocio`, `estado_caja`, `buscar_cotizaciones`, `ver_gastos`, `movimientos_caja`, `productos_mas_vendidos`, `clientes_con_deuda`, `buscar_servicios`, `ver_promos_activas`, `historial_cliente`, `buscar_devoluciones`, `movimientos_inventario`, `detalle_venta`, `comparar_periodos`, `cotizaciones_por_vencer`, `gastos_vs_ingresos`, `info_negocio`, `sesiones_caja_anteriores`, `producto_sin_movimiento`, `usuarios_roles`, `subscription_status`, `arca_config`, `categorias`, `audit_logs`

---

## 3. QUÉ ESTÁ ROTO 🔴

### 3.1 NOA Interno — no usa IA (problema raíz)

**Archivo:** `src/app/api/noa/internal/route.ts` + `src/lib/noa-intent-engine.ts`

El NOA interno que aparece dentro de la app **NO es IA**. Es un sistema de matching de palabras clave (strings hardcodeados). El flujo es:

```
Pregunta del usuario
       ↓
noa-intent-engine.ts   ← keywords: ["vend", "vendí", "venta"]
       ↓
¿Coincide con alguna keyword?
    ├── SÍ → executeNoaQuery() → respuesta con datos de DB
    ├── Palabras guía ("cómo", "dónde", "error") → searchKnowledge() → base estática
    └── NADA → registra HelpQuery en DB + responde "no encontré respuesta"
```

**Por qué falla:** Si el usuario escribe algo que no coincide exactamente con alguna keyword del engine, la respuesta es genérica o incorrecta. No hay comprensión del lenguaje natural.

**Lo que existe pero no se usa:** La `ANTHROPIC_API_KEY` ya está en `.env.local`. El SDK `@anthropic-ai/sdk` ya está instalado (`^0.96.0`). La infraestructura para usar Claude en el NOA interno **ya está**, solo falta conectarla.

**Fix requerido:** Reemplazar `noa-intent-engine.ts` (keyword matching) por una llamada a Claude con el contexto del tenant, los 28 intents y la base de conocimiento como sistema prompt.

### 3.2 Bug: rol ADMIN inexistente en emisión de facturas

**Archivo:** `src/app/api/invoices/route.ts`, línea ~20

```typescript
// CÓDIGO ACTUAL (ROTO):
requireRole(["OWNER", "ADMIN", "CASHIER"])

// ROLES VÁLIDOS en prisma/schema.prisma:
// OWNER, CASHIER, INVENTORY, READONLY
// ❌ ADMIN no existe
```

**Impacto:** El check de ADMIN es código muerto. OWNER y CASHIER pueden emitir facturas (correcto). ADMIN nunca matchea porque no existe. No falla en runtime, pero es incorrecto y confuso.

**Fix:** Cambiar a `requireRole(["OWNER", "CASHIER"])`.

### 3.3 Service.ivaRate no existe en el schema

**Archivo:** `prisma/schema.prisma` — modelo `Service`

El modelo `Product` tiene `ivaRate Float @default(0.21)`.  
El modelo `Service` **no tiene campo ivaRate**.

En `src/app/ui/pos.tsx` línea ~813:
```typescript
ivaRate: 0.21,  // ← hardcodeado cuando el ítem es un servicio
```

**Impacto:** Todos los servicios facturan siempre al 21% de IVA, sin importar cuál debería ser el valor real. No se puede configurar por servicio.

**Fix:** Agregar `ivaRate Float @default(0.21)` al modelo `Service` en el schema + migración + UI de edición de servicio + usar el valor del DB en el POS.

### 3.4 Cron endpoint desprotegido (seguridad)

**Archivo:** `src/app/api/cron/expire-quotes/route.ts`

```typescript
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return errorResponse("Unauthorized", 401);
}
```

Si `CRON_SECRET` **no está definido** en el entorno (y no está en ningún .env según la auditoría), la condición `if (cronSecret && ...)` es `false` y el endpoint queda **sin protección**. Cualquier HTTP GET a esta URL expiría cotizaciones de todos los tenants.

**Fix:** Agregar `CRON_SECRET` a las variables de entorno en Vercel + configurar el header en `vercel.json`.

---

## 4. VARIABLES DE ENTORNO — ESTADO COMPLETO

### 4.1 Variables presentes en .env (desarrollo)

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Prisma / Neon DB |
| `SOLVEN_USER` | Auth (usuario admin del sistema) |
| `SOLVEN_PASSWORD` | Auth |
| `SOLVEN_SESSION_SECRET` | Firma de JWT |
| `REBILL_WEBHOOK_SECRET` | Verificación HMAC de webhooks |
| `REBILL_API_KEY` | ⚠️ En .env pero **no se usa en ningún archivo de código** |
| `RESEND_API_KEY` | Envío de emails |
| `NEXT_PUBLIC_REBILL_CHECKOUT_URL` | URL de checkout de suscripción (en sidebar) |

### 4.2 Variables presentes en .env.local (desarrollo)

| Variable | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | NOA de ventas (landing) + pendiente para NOA interno |
| `ARCA_CERT_ENCRYPTION_KEY` | Cifrado de certificados AFIP |
| `ARCA_ENVIRONMENT` | `homologation` o `production` |

### 4.3 Variables AUSENTES — deben configurarse en Vercel

| Variable | Urgencia | Por qué |
|---|---|---|
| `CRON_SECRET` | 🔴 ALTA | Sin esto, el cron de cotizaciones es público |
| `NEXT_PUBLIC_APP_URL` | 🟡 MEDIA | Links en emails, redirecciones, URLs absolutas |
| `ANTHROPIC_API_KEY` | 🟡 MEDIA | Necesaria en producción para el NOA de ventas |
| `NEXT_PUBLIC_SENTRY_DSN` | 🟢 BAJA | Sin esto, Sentry no monitorea errores en producción |
| `SENTRY_ORG` | 🟢 BAJA | Para source maps de Sentry |
| `SENTRY_PROJECT` | 🟢 BAJA | Para source maps de Sentry |
| `SENTRY_AUTH_TOKEN` | 🟢 BAJA | Para source maps de Sentry |

### 4.4 Alerta de seguridad — credenciales expuestas

`.env.production.example` contiene credenciales reales de Neon DB (`npg_S8BR0uvsJmOD`) y `SOLVEN_PASSWORD=solven2024`.

**Acción requerida: Diego debe rotar estas credenciales manualmente. No está en el repo público por ser .gitignored, pero si el archivo existe en el sistema, es un riesgo.**

---

## 5. QUÉ EXISTE PERO NO ESTÁ CONECTADO A NADA ⚠️

### 5.1 REBILL_API_KEY

La clave de API de Rebill está en `.env` pero en toda la auditoría del código no aparece en ningún archivo `.ts` / `.tsx`. El webhook handler usa solo el `REBILL_WEBHOOK_SECRET` para verificar la firma HMAC. Si Rebill requiere la API key para alguna operación futura (consultar estado de suscripción por API, emitir reembolsos, etc.), la infraestructura está lista pero el código no la usa hoy.

### 5.2 HelpQuery y /ayuda/unanswered

El modelo `HelpQuery` en Prisma registra todas las preguntas que el NOA interno no pudo responder. Existe la página `/ayuda/unanswered` para que el OWNER las revise.  
**El problema:** con el NOA actual basado en keywords, el volumen de `HelpQuery` registradas es muy alto (casi todo lo que no matchea una keyword exacta). Sin fix del NOA, esta página es una lista de ruido.

### 5.3 "Licencia" en el sidebar

En `src/app/ui/app-shell.tsx`, hay un ítem de menú `type: "disabled"` con label "Licencia" que no lleva a ningún lado. Es un placeholder.

### 5.4 Sentry (monitoreo de errores)

El SDK `@sentry/nextjs` está instalado (v10.57.0). Los archivos `sentry.client.config.ts`, `sentry.edge.config.ts` y `sentry.server.config.ts` están configurados correctamente con:

```typescript
enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)
```

El monitoreo está **apagado** en producción porque `NEXT_PUBLIC_SENTRY_DSN` no está en las variables de entorno. Si se configura en Vercel, arranca instantáneamente sin cambio de código.

---

## 6. DOS SISTEMAS NOA — MAPA COMPLETO

Esta es la causa de confusión más importante del sistema:

```
┌─────────────────────────────────────────────────────────────────────┐
│  NOA #1 — VENTAS (landing page)                                     │
│  Endpoint: POST /api/noa                                            │
│  Auth: NINGUNA (público)                                            │
│  Motor: Claude Haiku (Anthropic API, streaming)                     │
│  Componente: src/components/noa/NoaChat.tsx                         │
│  Prompt: src/lib/noa-prompt.ts                                      │
│  Propósito: Convertir visitantes → trial de 14 días                 │
│  Estado: ✅ FUNCIONA CORRECTAMENTE                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  NOA #2 — INTERNO (dentro de la app)                                │
│  Endpoint: POST /api/noa/internal                                   │
│  Auth: REQUERIDA (getSession)                                       │
│  Motor: Keywords hardcodeadas (noa-intent-engine.ts) — SIN LLM     │
│  Componente: src/components/help/HelpChat.tsx                       │
│  Responses: src/lib/noa-responses.ts                                │
│  Propósito: Asistente de negocio para el comerciante                │
│  Estado: 🔴 ROTO — no entiende lenguaje natural                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. BASE DE CONOCIMIENTO ESTÁTICA

`src/lib/noa-knowledge/` tiene 18 archivos con texto estático sobre cómo usar SOLVEN:

`account.ts`, `arca.ts`, `cash.ts`, `customers.ts`, `dashboard.ts`, `faq.ts`, `glossary.ts`, `inventory.ts`, `navigation.ts`, `pos.ts`, `products.ts`, `promotions.ts`, `quotes.ts`, `reports.ts`, `returns.ts`, `services.ts`, `settings.ts`, `users.ts`

Esta información **es válida y útil** — describe funcionalidades reales de SOLVEN. El problema no es su contenido sino que solo se accede cuando el intent-engine detecta palabras como "cómo", "dónde", "error", "ayuda". Con un NOA basado en LLM, esta base puede usarse como contexto adicional del system prompt.

---

## 8. MODELOS PRISMA — INVENTARIO COMPLETO

25+ modelos en `prisma/schema.prisma`:

| Modelo | Propósito | Estado |
|---|---|---|
| `Tenant` | Empresa / local | ✅ |
| `User` | Usuarios con roles | ✅ |
| `Product` | Productos con ivaRate | ✅ |
| `Service` | Servicios (sin ivaRate) | ⚠️ Falta campo ivaRate |
| `Category` / `Subcategory` | Clasificación de productos | ✅ |
| `Sale` | Ventas con cae nullable | ✅ |
| `SaleItem` | Ítems de venta con ivaRate | ✅ |
| `Return` / `ReturnItem` | Devoluciones | ✅ |
| `Expense` | Gastos | ✅ |
| `Customer` | Clientes | ✅ |
| `Debt` / `DebtPayment` | Deudas | ✅ |
| `CashMovement` | Movimientos de caja | ✅ |
| `CashRegisterSession` | Sesiones de caja | ✅ |
| `InventoryMovement` | Movimientos de stock | ✅ |
| `Promotion` / `PromotionUsage` | Promociones | ✅ |
| `Quote` / `QuoteItem` | Cotizaciones | ✅ |
| `Subscription` | Estado de suscripción por tenant | ✅ |
| `StoreSettings` | Configuración del local | ✅ |
| `HelpQuery` | Preguntas sin respuesta al NOA | ✅ (conectado, ver 5.2) |
| `CodeCounter` | Contador autoincremental de códigos | ✅ |
| `AuditLog` | Registro de acciones | ✅ (módulo completo) |
| `TenantARCAConfig` | Configuración AFIP por tenant | ✅ |
| `ARCATokenCache` | Cache de tokens WSAA | ✅ |
| `Invoice` | Facturas electrónicas emitidas | ✅ |

---

## 9. TESTS

Archivos de tests encontrados:
- `src/app/api/products/route.integration.test.ts`
- `src/app/api/sales/route.integration.test.ts`
- `src/lib/noa-queries.test.ts`

Test runner: **Vitest** v3.2.4 (instalado).

**No se ejecutaron los tests en esta auditoría.** Se desconoce si pasan o no actualmente.

---

## 10. PLAN DE ACCIÓN PRIORIZADO

### Prioridad 1 — Crítica (hacer hoy)

**P1-A: Proteger el cron endpoint**
```
Acción: Agregar CRON_SECRET en Vercel Environment Variables
```

**P1-B: Corregir bug de rol ADMIN en facturas**
- Archivo: `src/app/api/invoices/route.ts`
- Cambio: `requireRole(["OWNER", "ADMIN", "CASHIER"])` → `requireRole(["OWNER", "CASHIER"])`

**P1-C: Rotar credenciales de Neon DB**
- Archivo afectado: `.env.production.example` (tiene token real)
- Acción: Diego rota manualmente en el dashboard de Neon

### Prioridad 2 — Alta (esta semana)

**P2-A: Conectar NOA interno con LLM (Claude)**

El plan mínimo viable:
1. En `/api/noa/internal/route.ts`, en lugar de llamar `answerNoaQuestion()`, llamar a la API de Anthropic
2. El system prompt incluye: identidad (NOA asistente de SOLVEN), datos del tenant (nombre del negocio, plan), los 28 intents disponibles, y opcionalmente el contenido de `noa-knowledge/`
3. Claude decide qué intent usar y puede llamar directamente a `executeNoaQuery()` con los parámetros necesarios, o responder con texto de la base de conocimiento
4. La respuesta sigue siendo JSON `{reply, data?, navigation?}` para que `HelpChat.tsx` funcione sin cambios

Infraestructura ya disponible:
- `ANTHROPIC_API_KEY` en `.env.local` ✅
- `@anthropic-ai/sdk` instalado ✅  
- 28 queries Prisma implementados en `noa-queries.ts` ✅
- Knowledge base estática en `noa-knowledge/` ✅

**P2-B: Agregar `ivaRate` al modelo Service**
1. `prisma/schema.prisma`: agregar `ivaRate Float @default(0.21)` al modelo `Service`
2. Crear y correr migración
3. Actualizar UI de crear/editar servicio
4. En `pos.tsx` línea ~813: cambiar `ivaRate: 0.21` por `ivaRate: service.ivaRate`

### Prioridad 3 — Media (próximas semanas)

**P3-A: Configurar variables de entorno faltantes en Vercel**
- `NEXT_PUBLIC_APP_URL` → URL de producción de SOLVEN
- `ANTHROPIC_API_KEY` → necesaria para NOA de ventas en producción
- `CRON_SECRET` → (ver P1-A)

**P3-B: Activar Sentry**
- Crear DSN en sentry.io
- Agregar `NEXT_PUBLIC_SENTRY_DSN` en Vercel
- Agregar `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- No requiere cambios de código

**P3-C: Limpiar REBILL_API_KEY**
- Si no se va a usar: remover de `.env`
- Si se va a usar para consultas a la API de Rebill: documentar para qué

### Prioridad 4 — Baja / Deuda técnica

**P4-A: Corregir "Licencia" en sidebar**
- Conectar a `/cuenta` o eliminar el ítem disabled

**P4-B: Revisar HelpQuery**
- Una vez implementado el NOA con LLM, las `HelpQuery` sin respuesta deberían bajar significativamente
- La página `/ayuda/unanswered` pasa a ser útil para casos edge reales

---

## 11. QUÉ ESTÁ BIEN Y NO TOCAR

- **Color primario #7c3aed (violet-600)** — SAGRADO, no cambiar
- **IVA como fracciones** (0, 0.105, 0.21, 0.27) — correcto en todo el código
- **ARCA como opt-in** — correcto, `Sale.cae` nullable
- **Moneda ARS** — única moneda en todo el sistema
- **Multi-tenancy** — bien implementado, todos los queries tienen `tenantId`
- **JWT custom** — funciona correctamente, no romper
- **Rebill webhook** — verificación HMAC correcta, 5 eventos manejados
- **Resend emails** — 6 emails transaccionales funcionando
- **ARCA WSAA/WSFE** — implementación completa en `src/lib/arca/`

---

*Documento generado por auditoría completa del codebase SOLVEN — commit faebc39 — 2026-06-13*
