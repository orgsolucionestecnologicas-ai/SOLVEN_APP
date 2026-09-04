# SOLVEN — Master Context for AI Agents

> Este archivo es la fuente de verdad para cualquier agente IA trabajando en SOLVEN.
> Fecha de actualización base: 2026-07-18 (verificación completa línea por línea) | Commit base: 7be97d0
> Refresco parcial 2026-09-02: secciones 3, 5, 6, 11 y 13 actualizadas con el resultado del primer ciclo completo de auditoría proactiva INGENIERODETESTEO (31-08-2026 a 02-09-2026) — no es una re-verificación completa del documento entero, solo de lo que cambió en ese ciclo. Ver sección 13 para el detalle.
> Refresco parcial 2026-09-04: secciones 1, 3, 5 y 6 actualizadas con el rediseño UI/UX en `design/revision-uiux-sep-2026` (RET-UX-01/02, POS-UX-02), el hallazgo `SALE-TENANT-SCOPE` del TEST COMPLETO del 03-09-2026, y el estado de `ARCA-NC-01`. También se reconciliaron dos secciones de arquitectura que se habían perdido temporalmente de esta copia por divergencia entre `main` y la rama de diseño (ver nueva sección de changelog al final). Tampoco es una re-verificación completa del documento entero.

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
- **Rama activa en paralelo a `main` desde el 02-09-2026: `design/revision-uiux-sep-2026`.** Rediseño de UI/UX con preview de Vercel para aprobación visual de Diego antes de mergear (patrón DESIGN-01/02, ver sección 5). Mientras esta rama esté activa, **confirmá siempre en qué rama está el directorio de trabajo antes de asumir dónde vive un cambio** (`git branch --show-current`) — los archivos de `TAREAS/*.md` pueden divergir entre `main` y esta rama si se editan en las dos sin reconciliar (pasó de verdad, ver `TAREAS/INGENIERO_LIDER.md` → "Cuándo hay una rama activa además de `main`"). Código en esta rama al 04-09-2026: quitó "Más vendidos" del POS, unificó el flujo de Devolver, reintegro multi-método real, grilla de tarjetas de productos — ver sección 13 para el detalle completo.

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

### Revalidación de sesión contra la DB (con cache TTL)
Desde USER-FIX-03 (02-09-2026), `requireRole()` en `src/lib/tenant.ts` no confía ciegamente en el JWT — además de verificar la firma, revalida `active`/`role`/`tenantId` contra la tabla `User` real, para que un usuario desactivado o con el rol cambiado no pueda seguir operando con una sesión ya emitida. Para no pegarle a la base en cada request, el resultado se cachea en memoria por `userId` con `SESSION_REVALIDATE_TTL_MS = 2 * 60 * 1000` (2 min) — un `Map<string, number>` a nivel de módulo, con export de test `__resetSessionRevalidationCacheForTests()`. Efecto práctico: un usuario recién desactivado por el OWNER puede seguir operando hasta 2 minutos más (ver `PENDIENTES.md` → T20, decisión de producto abierta sobre si ese valor es el correcto). Este patrón es el que hay que replicar si se agrega otra verificación "debe reflejar el estado más reciente de la DB, pero no en cada request" en el futuro.

### Motor de promociones: "solo gana la mejor oferta, nunca se acumulan"
Rediseñado por completo en PROMO-FIX-02 (02-09-2026), por decisión explícita de Diego. `applyPromotionsToCart` (`src/modules/promotions/promotion-engine.ts`) evalúa cada promoción activa de forma aislada (`runPromotionInIsolation`) contra una copia fresca de los ítems del carrito a **precio original** — nunca contra el resultado ya descontado de otra promoción. Cada promoción produce un `ItemProposal[]` (precio final propuesto por ítem); un `Map` de ganador por `itemIndex` se queda con la propuesta de mayor descuento (`greaterThan` estricto), y en caso de empate exacto gana la promoción procesada primero. `applyPromotionsToCart` también recibe `customerSegment` — verificar SIEMPRE que cualquier call site nuevo que la invoque (hoy: `sale-data-access.ts` y `api/promotions/apply`) resuelva y pase el segmento real del cliente, porque olvidar este parámetro no rompe tipos ni tests existentes, solo hace que las promociones de segmento (VIP/Recurrente/Nuevo) nunca se disparen en silencio — exactamente el bug que originó este fix (PROMO-FIX-01).

### ARCA: reserva de fila antes de llamar a AFIP + reintento ante "comprobante ya autorizado"
Desde REPORTE-FIX-01/02 (02-09-2026), `emitInvoice` (`src/modules/invoices/invoice-data-access.ts`) primero crea una fila `Invoice` placeholder (apoyada en el `@unique` de `Sale.saleId`) ANTES de pedirle un CAE real a AFIP — así una segunda emisión concurrente de la misma venta rechaza por `P2002` sin gastar un comprobante fiscal real, y si la request a AFIP falla, la fila reservada se borra. Si AFIP rechaza con el código `10016` ("comprobante ya autorizado" — dos ventas *distintas* reservando el mismo número local porque ninguna incrementó todavía el contador real de AFIP), se reintenta una sola vez con el próximo número real en vez de mostrarle el error crudo al cajero (`AFIP_VOUCHER_NUMBER_TAKEN_CODE = "10016"`). Este patrón (reservar-antes-de-llamar-a-un-servicio-externo-no-transaccional) es el que hay que replicar si se agrega otra integración fiscal/externa con la misma forma de doble emisión.

### Reconciliación por método de pago real, a partir de `Sale.paymentDetails`
Desde CAJA-UX-01 (02-09-2026), `computePaymentMethodBreakdown` (`src/app/ui/cash-register-close.tsx`) es el patrón de referencia para calcular montos reales por método de pago (Efectivo/Tarjeta/Transferencia/VentaWeb/Otro + Crédito) a partir de `Sale.paymentDetails` — antes el cierre de caja tenía Tarjeta y Transferencia hardcodeadas en `$0`, invisibles incluso cuando había ventas reales con esos métodos, y las ventas `MIXED` no aparecían en ningún lado del desglose aunque sí sumaban al total. La función recorre TODAS las ventas del período (no solo las filtradas por `paymentType`), suma cada `paymentDetail.amount` a su método, y manda a "Crédito" tanto las ventas 100% `CREDIT` sin desglose como el resto no cobrado de una venta `MIXED` (`net - collected`). Ventas sin `paymentDetails` cargado se excluyen del desglose por método (no se asumen como Efectivo) — mismo criterio de nulabilidad que `costPrice: null` en reportes. Replicar este patrón para cualquier vista futura que necesite reconciliar montos por método de pago real (ej. `ARCA-MENSUAL-01` en `PENDIENTES.md`, si en algún momento necesita desglosar el paquete mensual por forma de cobro).

### Exportación CSV: helper compartido `src/lib/csv.ts`
Desde CAJA-UX-01 (02-09-2026), los 9 puntos de exportación CSV client-side de la app (antes cada uno con su propia copia de `escapeCsvValue`/`Blob`/`URL.createObjectURL`) usan `downloadCsv(filename, header, rows)` de `src/lib/csv.ts`, que antepone el BOM de UTF-8 (`﻿`) — sin eso, Excel en Windows no detecta UTF-8 al abrir el archivo con doble clic y rompe tildes/ñ. Cualquier CSV nuevo, cliente o servidor, debería usar este helper (o al menos anteponer el mismo BOM del lado servidor, como se hizo en `src/app/api/reports/export/route.ts`) en vez de reimplementar la descarga.

### Reintegro multi-método real, sin número de operación
Desde RET-UX-02 (04-09-2026), `processReturn` (`src/modules/returns/index.ts`) ya no acepta un `refundMethod` único desconectado de cómo se cobró la venta: `Return.refundDetails Json?` (mismo tipo `{method, amount}[]` que `Sale.paymentDetails`, sin `reference` — se sacó del todo el 04-09-2026, ver más abajo) se valida contra los métodos reales de `Sale.paymentDetails`, con tope por método considerando reintegros parciales previos de la misma venta. El `CashMovement` OUT se genera solo por la porción "Efectivo" del reintegro, no por el total. **El campo `reference`/"N° de operación" que existía para Tarjeta se sacó por completo el 04-09-2026** (a pedido de Diego, ver sección 13) — no lo reintroduzcas sin confirmar con él primero, fue una decisión explícita, no un olvido.

### Parseo de montos tipeados a mano: nunca `type="number"` puro
Desde el fix del 04-09-2026 en `src/app/ui/returns.tsx` (`parseAmountInput`): un `<input type="number">` bloquea directamente la tecla "," en la mayoría de los navegadores, así que un monto en formato argentino ("1.500,50") no se puede tipear bien y el reintegro/monto termina sin coincidir con lo esperado. Cualquier campo de monto que el usuario tipea a mano debe ser `type="text"` + `inputMode="decimal"` con una función de parseo tolerante a "1500.50"/"1500,50"/"1.500,50" (usa el separador que aparece más a la derecha como decimal) — replicar `parseAmountInput` como referencia en vez de confiar en la validación nativa del navegador.

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
| Sin Nota de Crédito AFIP para devoluciones de ventas ya facturadas | `src/app/ui/return-credit-note-pdf.tsx` (solo comprobante interno, sin llamada a `src/lib/arca`/WSFE) | Encontrado por INGENIERODETESTEO (31-08-2026, reconfirmado 02-09-2026). Una devolución de una venta con CAE real no genera ninguna Nota de Crédito fiscal ante AFIP. **Orden ya escrita** (`TAREAS/ARCA-NC-01_nota-de-credito-automatica.md`, rama `main`, 04-09-2026) tras decisión de Diego sobre cómo resolver el prorrateo — pendiente de ejecución. Ver `PENDIENTES.md` → `ARCA-NC-01`. |
| Rate limiting de login en memoria no escala a múltiples instancias serverless | `src/middleware.ts` (`Map` en memoria para `/api/auth/login`) | El límite (10/min) se cuenta por instancia de función, no globalmente — en Vercel con varias instancias concurrentes el límite real efectivo es mayor al declarado. No es una vulnerabilidad nueva, reconfirmada durante USER-FIX (02-09-2026). Ver `PENDIENTES.md` → `USER-RATELIMIT`. |
| `createSale` no filtra productos/servicios por tenant al leer precio/IVA, ni al descontar stock | `src/modules/sales/sale-data-access.ts:133-134` (`findMany` sin `tenantId`), `:592-597` (`reduceProductStock`, UPDATE crudo sin `tenantId`) | Encontrado en el TEST COMPLETO de regresión (03-09-2026, `TAREAS/TEST_COMPLETO_SEP2026.md`). Un usuario del tenant A que conozca un `id` de producto/servicio del tenant B puede leer su precio/`ivaRate` y descontar su stock. Misma clase que `INV-FIX-01` pero nunca auditado en el camino de venta. Exploitabilidad acotada (requiere CUID ajeno no enumerable, sin pérdida de dinero) — no bloquea producción, pero es el ítem #1 de la próxima orden de código. Ver `PENDIENTES.md` → `SALE-TENANT-SCOPE`. |

### ✅ Resueltos — primer ciclo completo de auditoría proactiva INGENIERODETESTEO (31-08-2026 a 02-09-2026)

> Metodología: un rol nuevo (`TAREAS/INGENIERODETESTEO.md`, también disponible como skill `solven-edge-case-auditor`) audita SOLVEN sección por sección (mismo orden que `src/modules/`), razonando escenarios de negocio realistas contra el código real y clasificándolos en bug confirmado / verificado-correcto / inconcluso — nunca hipotetiza sin leer el código. El detalle línea-por-línea de cada ciclo de verificación del Ingeniero Líder vive en `TAREAS/REPORTELIDER.md` (no se pierde: el archivo de trabajo `ordenestest.md` se eliminó al cerrar este primer ciclo completo, con todo su contenido reutilizable ya volcado acá y en `PENDIENTES.md`). Los hallazgos "verificado correcto" e "inconcluso" de cada sección quedaron preservados como ítems de `PENDIENTES.md` cuando implicaban una decisión de producto o reproducción en vivo pendiente.

| Ciclo | Resuelto en | Fecha | Resumen |
|-------|-------------|-------|---------|
| POS-FIX-01..04 | commit `481852f` | 2026-08-31 | Descuentos manuales/globales del POS ahora se validan y aplican en el backend (antes el cajero veía un total con descuento pero se cobraba precio de lista); `discountAmount`/`promotionIds` recalculados server-side contra el motor real, no confiados del cliente; `GET /api/sales` exige el mismo rol que `POST`; `confirmQuote` con `updateMany` guardado (`QuoteAlreadyConfirmedError`) contra doble confirmación concurrente. |
| RET-FIX-01..07 | commit `6a36a95` | 2026-08-31 | Transacción `Serializable` + `ReturnConcurrentConflictError` para la carrera de cantidad devuelta; reintegro prorrateado por el descuento real de la venta (antes a precio de lista); `Debt` de ventas MIXED se reduce igual que CREDIT (gap de `FEATURE-01`); `GET /api/returns` con rol; reintegro en efectivo exige caja abierta; `AuditLog` en devoluciones. RET-FIX-06 (devolver venta de Servicio) diferido como pregunta de producto. |
| CAJA-FIX-01..05 | 2026-09-01 | 2026-09-01 | Índice único parcial en Postgres contra doble apertura concurrente de caja; campo `method` en `Expense`/`DebtPayment` (antes todo se asumía Efectivo); caja abierta obligatoria para gastos/pagos de deuda en efectivo y movimientos manuales; `GET` de caja con rol; `closeSession` con `updateMany` guardado contra doble cierre concurrente. Efecto colateral encontrado y resuelto aparte: el cron de gastos recurrentes no aislaba fallas por tenant (ver fila siguiente). |
| Aislamiento por tenant del cron de gastos recurrentes + método de pago + catch-up | directo (Ingeniero Líder) | 2026-09-01 | `generateDueRecurringExpenses()` ahora aísla cada tenant en su propio `try/catch` (antes un tenant sin caja abierta cortaba el cron para todos los tenants siguientes); `RecurringExpense.method` nuevo (antes el cron asumía Efectivo para todo, incluso alquiler/suscripciones por transferencia); el cron hace catch-up si un gasto no se generó el día que le tocaba. |
| INV-FIX-01..10 | 2026-09-01 | 2026-09-01 | `adjustProductStock` pasa de ignorar `tenantId` (un tenant podía leer/modificar stock de otro conociendo el `id`) a optimistic locking real con scope de tenant; `DELETE /api/products/[id]` con rol + bloqueo si el producto tiene ventas/movimientos asociados; `Product.productCode` único por tenant (antes global); alerta de stock bajo con throttle de 12hs (`ProductLowStockAlert`, tabla nueva); aviso no bloqueante si `salePrice < costPrice`. |
| DEUDA-FIX-01..06 | commit `83900e9` | 2026-09-01 | `registerDebtPayment` scopeado por `tenantId` (antes un tenant podía pagar/leer la deuda de otro conociendo el `id` — el más crítico del ciclo); `writeOffDebt` zeroea `remainingAmount` en la fuente; `AuditLog` en pagos/condonaciones; `GET` de deudas/clientes con rol; aviso de límite de crédito visible; `Customer.customerCode` único por tenant (antes global). |
| COT-FIX-01..08 + COT-FOLLOWUP-01 | commits `e4edb30`, directo | 2026-09-02 | `confirmQuote` exige caja abierta antes de crear la venta; monto de caja/deuda usa el neto (`totalAmount - discountAmount`, tope acotado con `Prisma.Decimal.min`); acepta método de pago real (antes forzaba `CASH`); copia `customerId`/`sellerId` a la venta generada (`Quote.sellerId`/`sellerCode`, campos nuevos); `GET` con rol; auditoría. Seguimiento directo (COT-FOLLOWUP-01): el método elegido ahora también queda en `Sale.paymentDetails`, no solo si fue CASH/CREDIT. |
| REPORTE-FIX-01..07 | commit `107ae44` | 2026-09-02 | Patrón "reserva-antes-de-AFIP" contra doble emisión de factura + reintento ante código `10016` (ver sección 3, "ARCA: reserva de fila..."); reportes de exportación con horario `-03:00` explícito (antes usaban UTC del proceso); exportación con rol OWNER; `getInvoiceBySaleId` exige `tenantId`; vencimiento de certificado ARCA expuesto en `GET /api/invoices/test`; `AuditLog` con `INVOICE_EMITTED`. |
| PROMO-FIX-01..07 | commit `3f17900` | 2026-09-02 | `customerSegment` ahora se resuelve y pasa de verdad al motor (antes las promos VIP/Recurrente/Nuevo nunca aplicaban — el bug crítico del ciclo); motor reescrito a "solo gana la mejor oferta" (ver sección 3); solapamiento cruzado ALL_PRODUCTS/CATEGORY/SPECIFIC_PRODUCT; validaciones de coherencia tipo/aplicación; `PromotionUsage` se libera en devolución total; `GET` con rol OWNER; auditoría. |
| USER-FIX-01..09 | commit `5b3794c` | 2026-09-02 | `getHmacKey()` explota si falta o es corto `SOLVEN_SESSION_SECRET` (antes firmaba con clave vacía silenciosamente); `verifySession` devuelve `null` si el rol del payload es inválido (antes asumía `OWNER` por defecto — el bug más grave del ciclo completo); revalidación de sesión contra la DB con TTL (ver sección 3); `User.email` único por tenant en vez de global (migración aplicada a Neon, decisión de Diego); `GET` de permisos con rol; validación de formato de email; rate limit en `switch-cashier`; auditoría; guard de `NODE_ENV` en el seed. |
| RET-UX-01 | commit `95310f0` | 2026-09-02 | Rama `design/revision-uiux-sep-2026` (primer push). Búsqueda por chips (N° de venta/Cliente/Documento/Fecha) en "Nueva devolución"; `Return.refundReference` nuevo (sacado de uso después, ver RET-UX-02); reintegro con tarjeta obligado si la venta se pagó (total o parcial) con tarjeta. |
| RET-UX-02 + 2 gaps + fix directo | commits `f61212c`..`bf0a7a7` | 2026-09-04 | Rama `design/revision-uiux-sep-2026`. Sacó "Más vendidos" del POS; unificó el botón "Devolver" de Historial con el formulario real de Devoluciones; reintegro multi-método real (`Return.refundDetails`, ver secciones 3 y 6); banner de sugerencia (cobrar la venta nueva antes de devolver la anterior). Gaps encontrados y cerrados por el Ingeniero Líder: preselección de venta con fallback a `GET /api/sales/[id]` (nuevo), método de pago real en la lista de Devoluciones. Fix directo adicional: sacado el N° de operación de todos los medios de reintegro + arreglado el parseo de montos con coma decimal (ver sección 3). |
| POS-UX-02 | commit `ccce045` | 2026-09-04 | Rama `design/revision-uiux-sep-2026`. Grilla de tarjetas (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) en vez de lista para los productos de una categoría en el POS; cápsula "Detalle" por tarjeta, enlaza a `/products/{id}` en pestaña nueva. Confirmó de paso que un `CASHIER` ya podía llegar a `ProductEditView` (formulario de edición completo, sin modo de solo lectura) desde el menú "Productos" — no es nuevo, pero esta orden le sumó una segunda vía más frecuente. Ver `PENDIENTES.md` → `PROD-FORM-RO`. |

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
| `CashMovement`/reportes/cierre de caja usaban `totalAmount` bruto en vez de neto (`- discountAmount`) en ventas con promoción; roles no-Owner (CASHIER/INVENTORY/READONLY) veían "Ajustes" por defecto | FIX-14 (commits `50eddaa`, `30eecc9`, `62abb5a`) — helper `saleNet` agregado por el agente ejecutor tenía una recursión infinita (`saleNet` llamándose a sí mismo), no detectada por lint/typecheck/test; corregida por el Ingeniero Líder en `62abb5a` | 2026-08-30 |

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
ProductLowStockAlert
```
33 modelos desde INV-FIX-01..10 (02-09-2026) — se agregó `ProductLowStockAlert` (throttle de 12hs para el email de stock bajo) respecto a los 32 de la versión anterior de esta lista.

**Enums:** `SalePaymentType` (CASH|CREDIT|MIXED — nuevas ventas vía API restringidas a CASH solamente), `UserRole` (5 valores, ver sección 3), `SubscriptionStatus`, `QuoteStatus`, `ReceiptType`, `ReturnReasonCategory`, `PromotionType`, `PromotionApplication`, `PromotionActivation`, `CustomerSegment`, `CashRegisterStatus`.

**Campos críticos:**
- `Sale.cae String?` — nullable (ARCA opt-in)
- `Sale.paymentDetails Json?` — desglose real de pago dividido (efectivo/tarjeta/transferencia/etc.), independiente de `paymentType`. Desde COT-FOLLOWUP-01 (02-09-2026) también lo llena `confirmQuote`, no solo `createSale`.
- `SaleItem.ivaRate`, `Product.ivaRate`, `Service.ivaRate`, `QuoteItem.ivaRate` — los 4 son `Float @default(0.21)`, todos configurables desde FIX-10 (antes `Service`/`QuoteItem` no existían)
- `Return.refundMethod String?` — nullable solo si la venta original fue `CREDIT` (desde FIX-07). Desde RET-UX-02 (04-09-2026) se escribe siempre `null` en devoluciones nuevas — el desglose real vive en `refundDetails` (ver abajo); se dejó el campo por compatibilidad con filas viejas, no se usa para renderizar nada en la UI actual.
- `Return.refundReference String?` — agregado en RET-UX-01 (02-09-2026) para el N° de operación de tarjeta; **sacado de uso el 04-09-2026** a pedido de Diego (ya no se pide ni se valida en ningún lado, ni para el campo viejo ni dentro de `refundDetails`). Campo nullable, queda en el schema por las filas históricas, no lo reintroduzcas sin confirmar con Diego.
- `Return.refundDetails Json?` — desde RET-UX-02 (04-09-2026, migración `20260904112338_add_return_refund_details`), desglose real del reintegro por método (`{method, amount}[]`, mismo formato que `Sale.paymentDetails` sin `reference`), validado contra los métodos reales con los que se cobró la venta y con tope acumulado entre reintegros parciales. Ver "Reintegro multi-método real" en sección 3. **`RET-DEV-METODO` de `PENDIENTES.md` está cerrado por esto.**
- `RolePermission` — ver sección 3, sistema de permisos por tenant
- `User.email` — desde USER-FIX-04 (02-09-2026) es único **por tenant** (`@@unique([tenantId, email])` + `@@index([email])`), ya no global. Migración `20260902100000_user_email_tenant_unique` aplicada a Neon. El login itera candidatos por email (`findMany` + `verifyPassword` contra cada uno) porque el mismo email puede existir en varios tenants — es el diseño esperado, no un bug de rendimiento (las contraseñas son independientes por tenant, matchea como máximo un usuario real).
- `Customer.customerCode`, `Product.productCode` — desde DEUDA-FIX-06/INV-FIX (01-09-2026) únicos **por tenant**, ya no global. `Quote.quoteNumber` sigue siendo único global (sin riesgo de colisión real, ver `PENDIENTES.md`).
- `Quote.sellerId String?` / `Quote.sellerCode String?` — nuevos desde COT-FIX (02-09-2026), copiados a `Sale` al confirmar.
- `RecurringExpense.method String?` — nuevo desde el fix directo de gastos recurrentes (01-09-2026), default "Efectivo" si se omite; antes el cron trataba todo gasto recurrente como efectivo.
- `CashRegisterSession` — índice único parcial `CashRegisterSession_tenantId_open_unique` (`WHERE status='OPEN'`) desde CAJA-FIX-01, bloquea doble apertura concurrente a nivel de Postgres, no solo de aplicación.

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

No se corrió la suite completa dentro de este entorno de auditoría (limitación del sandbox: binarios nativos de `rollup` compilados para Windows no corren en Linux) — el conteo de tests pasando debe confirmarse corriendo `npm test` en el entorno real antes de confiar en cualquier número específico. El agente ejecutor reportó 323 passed / 2 skipped tras TESTS-01; tras el primer ciclo completo de auditoría INGENIERODETESTEO (31-08-2026 a 02-09-2026) el conteo subió a 463 passed / 2 skipped (reportado por el agente ejecutor en USER-FIX-01..09, el último ciclo). Módulos nuevos con test agregados en este ciclo: `promotion-engine` (casos de no-acumulación y empate exacto), `tenant.test.ts` (revalidación de sesión con TTL), `recurring-expense-*` (con reloj simulado), `role-permissions/route.test.ts` (antes sin cobertura). Dos piezas de este ciclo quedaron sin test automatizado y se verificaron a mano por el Ingeniero Líder (ver `TAREAS/REPORTELIDER.md`, entrada PROMO-FIX-01..07): el cableado de `customerSegment` en `sale-data-access.ts`/`apply/route.ts`, y la liberación de `PromotionUsage` en devolución total.

---

## 12. CONVENCIONES DE CÓDIGO

- **Errores API:** usar helpers de `src/app/api/_shared/responses.ts` (successResponse, errorResponse, forbiddenResponse, unauthorizedResponse)
- **Módulos de negocio:** patrón `*-validation.ts` (funciones puras de validación + tipos) + `*-data-access.ts` (queries Prisma) + `index.ts` (barrel export) — seguido consistentemente en las 22 carpetas de `src/modules/`
- **Tests:** Vitest — correr `npm run lint && npm run typecheck && npm test` antes de cada commit
- ⚠️ **Lint/typecheck/test NO garantizan ausencia de bugs de runtime en componentes de UI sin test de render** (ej. `reports.tsx`, `cash-register-close.tsx`): un helper recursivo sobre sí mismo (`function f(x){ return f(x) - ... }`) es válido en TypeScript y no lo agarra ningún test si no hay uno que efectivamente renderice/ejecute el componente (ver FIX-14, sección 5). Al agregar o modificar funciones puras de agregación en `src/app/ui/*.tsx`, releerlas una vez más buscando específicamente auto-referencias antes de dar el fix por cerrado.
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

## 14. DECISIONES DE ARQUITECTURA REGISTRADAS (DA)

Log numerado y compacto para citar rápido ("post-DA-10", "ver DA-13") en vez de
repetir la explicación completa cada vez. Migrado desde `SOLVEN_CEREBRO_DEFINITIVO.pdf`
v3.0 (22-07-2026) el 04-09-2026 — el PDF queda retirado como documento vivo,
esta tabla es ahora la fuente de verdad para el log de decisiones. Agregar una
DA-17+ acá cuando se tome una decisión de arquitectura nueva que valga citar por ID.

| ID | Decisión | Detalle |
|---|---|---|
| DA-01 | Moneda única ARS | SOLVEN opera exclusivamente en Pesos Argentinos. Sin soporte USD/EUR/RD$. |
| DA-02 | `ivaRate` como fracción AFIP | Alícuotas como decimales: `0, 0.105, 0.21, 0.27`. Nunca enteros. |
| DA-03 | `SaleItem.ivaRate` histórico | Se preserva la alícuota al momento de venta para integridad financiera histórica. |
| DA-04 | ARCA opt-in doble | Opt-in por tenant Y por venta. Ticket siempre disponible sin ARCA. `Sale.cae` nullable. |
| DA-05 | Multi-tenancy shared DB | Todos los tenants comparten la misma DB Neon. Separación por columna `tenantId`, sin RLS. |
| DA-06 | `ForbiddenError` vs `UnauthorizedError` | 403 = autenticado sin permisos. 401 = no autenticado. No intercambiarlos. |
| DA-07 | Rebill para suscripciones | Cobros recurrentes Argentina. Webhooks actualizan `Subscription`. |
| DA-08 | Auth por cookie JWT | Cookie `solven_session`. Nunca `localStorage` para sesión. |
| DA-09 | NOA dual-instance | NOA externo (landing) no se toca. NOA interno fue removido — visión futura es NOA Operativo (sección 7). |
| DA-10 | Confiar solo en el servidor para dinero | Cualquier endpoint que mueva dinero, stock o facturación recalcula desde la DB — nunca confía en el payload del cliente (post-FIX-08). |
| DA-11 | Notion deprecado como backlog | Desde 18/22-07-2026, `TAREAS/PENDIENTES.md` es la única fuente de pendientes. Notion queda histórico, no activo. |
| DA-12 | Verificar backlog contra código | Ningún ítem "Pendiente" de un backlog se reporta como abierto sin verificarlo primero contra el código real — se encontraron reiteradas tarjetas desactualizadas. |
| DA-13 | Heredoc de bash para archivos a commitear | Escribir vía `cat > archivo << EOF` en vez del tool Write cuando el archivo se va a commitear en el mismo turno — desfase conocido entre ambos en este entorno. |
| DA-14 | Rebill al final del proyecto | Decisión explícita de Diego (18-07-2026) de tratar el hardening de la integración Rebill al cierre del proyecto, no ahora. |
| DA-15 | El agente ejecutor no se auto-verifica | Nunca escribe en su propio reporte que el Ingeniero Líder ya revisó/verificó su trabajo — ese veredicto lo agrega el Ingeniero Líder después, no antes. |
| DA-16 | `TAREAS/CLAUDE.md` es la única fuente técnica viva | Decisión explícita de Diego (04-09-2026): se retira `SOLVEN_CEREBRO_DEFINITIVO.pdf` como documento a mantener; su contenido vigente se migró a este archivo y a `TAREAS/INGENIERO_LIDER.md`/`TAREAS/PENDIENTES.md`. La raíz del repo tiene un `README.md` que apunta acá — no hay, ni debe crearse, un segundo `CLAUDE.md`. |

## Cambios del ciclo 2026-09-02 (primer ciclo completo de auditoría proactiva INGENIERODETESTEO)

Entre el 31-08-2026 y el 02-09-2026 se completó la primera pasada completa de auditoría proactiva de edge cases (rol **INGENIERODETESTEO**, metodología en `TAREAS/INGENIERODETESTEO.md` / skill `solven-edge-case-auditor`) sobre las 9 secciones de SOLVEN, en el mismo orden que `src/modules/`: POS, Devoluciones, Caja, Inventario, Deudas, Cotizaciones, Reportes/ARCA, Promociones, Usuarios/Permisos. Cada sección se auditó leyendo el código real contra escenarios de negocio no triviales (nunca hipotetizando sin verificar), y cada bug confirmado pasó por el ciclo normal de ejecución (agente de VS Code) + verificación (Ingeniero Líder contra el diff real, nunca contra el self-report). Resumen de lo que cambió respecto a la versión anterior de este documento:

1. **Bugs resueltos:** 9 ciclos completos (POS-FIX, RET-FIX, CAJA-FIX, INV-FIX, DEUDA-FIX, COT-FIX + COT-FOLLOWUP-01, REPORTE-FIX, PROMO-FIX, USER-FIX) — ver la tabla nueva en sección 5. El más grave de todos: `verifySession` asumía el rol `OWNER` por defecto si el JWT no traía uno válido, combinado con un `getHmacKey()` que firmaba con clave vacía si faltaba `SOLVEN_SESSION_SECRET` — forja de sesión `OWNER` trivial sin credenciales (USER-FIX-01/02).
2. **Patrones arquitectónicos nuevos, documentados en sección 3:** revalidación de sesión contra la DB con cache TTL de 2 min; motor de promociones rediseñado a "solo gana la mejor oferta" (dejó de acumular descuentos); patrón "reserva de fila antes de llamar a AFIP" + reintento ante código `10016` para ARCA.
3. **Unicidad de campos identificadores:** `User.email`, `Customer.customerCode` y `Product.productCode` pasaron de únicos globales (bug de aislamiento real: un valor usado por un tenant bloqueaba a todos los demás) a únicos por tenant — 3 migraciones aplicadas y verificadas contra Neon.
4. **Modelo nuevo:** `ProductLowStockAlert` (33 modelos totales). Campos nuevos: `RecurringExpense.method`, `Quote.sellerId`/`sellerCode`, índice único parcial en `CashRegisterSession` contra doble apertura concurrente.
5. **Gap de cumplimiento fiscal identificado, no resuelto:** sin Nota de Crédito AFIP para devoluciones de ventas ya facturadas — agregado a la tabla de bugs activos en sección 5 (`ARCA-NC-01` en `PENDIENTES.md`).
6. **Archivo de trabajo eliminado:** `TAREAS/ordenestest.md` (795 líneas acumuladas de las 9 auditorías) se borró al cerrar este primer ciclo completo — todo su contenido reutilizable (hallazgos "verificado correcto" que evitan reinvestigar, e "inconcluso" que requieren decisión de producto o reproducción en vivo) ya está volcado acá y en `PENDIENTES.md`. También se eliminaron `TAREAS/AGENTE_EJECUTOR.md` e `TAREAS/INGENIERODETESTEO.md` (constituciones de rol ya cumplidas/redundantes con este documento y el skill de Cowork) — el detalle línea-por-línea de cada verificación de este ciclo permanece en `TAREAS/REPORTELIDER.md`, que no se borra nunca.
7. **Tests:** de 323 passed / 2 skipped a 463 passed / 2 skipped (ver sección 11).

## Cambios del ciclo 2026-09-02 al 2026-09-04 (rediseño UI/UX + hallazgos del TEST COMPLETO)

Diego pidió pasar el flujo de trabajo a Visual Studio Code (`TAREAS/INGENIERO_LIDER.md`, escrito el 01-09-2026) y abrir una rama aparte para revisión de diseño (`design/revision-uiux-sep-2026`, desde el 02-09-2026). Resumen de lo que cambió desde la versión anterior de esta sección:

1. **Rama de diseño activa en paralelo a `main`** — ver nota en sección 1. Contiene RET-UX-01, RET-UX-02 y POS-UX-02 (ver tabla de resueltos en sección 5), todavía no mergeada a `main`. Mientras esté activa, los `TAREAS/*.md` pueden divergir entre ramas si se editan en las dos sin reconciliar — pasó de verdad (`PENDIENTES.md` llegó a tener contenido invisible entre una rama y la otra, incluido un hallazgo 🔴 Crítico) y se reconcilió a mano el 04-09-2026. Protocolo completo en `TAREAS/INGENIERO_LIDER.md`.
2. **Reintegro de devoluciones, rediseñado dos veces en la misma semana:** primero se agregó `refundReference` obligatorio para Tarjeta (RET-UX-01), después se reemplazó por completo por un desglose multi-método real (`Return.refundDetails`, RET-UX-02) y finalmente se sacó el campo de referencia de todos los métodos por decisión de Diego (fix directo, 04-09-2026) — ver sección 3, "Reintegro multi-método real, sin número de operación". Quien lea el código de `returns.tsx` sin este contexto podría pensar que el campo de referencia fue un olvido; fue una decisión explícita, documentada acá para que no se reintroduzca sin confirmar.
3. **`ARCA-NC-01` pasó de "hallazgo sin resolver" a "orden escrita, pendiente de ejecución"** — Diego resolvió las dos decisiones de producto pendientes (cómo tratar un canje con medios de pago mixtos, cuándo emitir la Nota de Crédito) y se investigó cómo AFIP/software de gestión profesional resuelve el prorrateo. La orden completa vive en `TAREAS/ARCA-NC-01_nota-de-credito-automatica.md` (rama `main`, no la de diseño, porque toca `src/lib/arca/*`).
4. **Nuevo hallazgo 🔴 Crítico: `SALE-TENANT-SCOPE`** — `createSale` no filtra productos/servicios por tenant al leer precio/IVA ni al descontar stock (ver tabla de bugs activos, sección 5). Encontrado en el TEST COMPLETO de regresión del 03-09-2026 (`TAREAS/TEST_COMPLETO_SEP2026.md`), no por INGENIERODETESTEO — sigue sin código que lo arregle.
5. **Patrones arquitectónicos nuevos, documentados en sección 3:** reconciliación por método de pago real (`computePaymentMethodBreakdown`, de CAJA-UX-01, 02-09-2026 — se había perdido temporalmente de esta copia del documento por la divergencia entre ramas, restaurado acá); helper compartido de exportación CSV (`src/lib/csv.ts`, también CAJA-UX-01); parseo tolerante de montos con coma decimal (`parseAmountInput`, 04-09-2026).
6. **`RET-DEV-METODO` cerrado** (ver `PENDIENTES.md`) — el reintegro ahora se valida contra el desglose real de pago de la venta, resuelto por RET-UX-02.
