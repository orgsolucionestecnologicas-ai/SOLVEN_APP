# ORDEN AL AGENTE — T14 + T23 + T26
## Rebill (suscripciones) + Webhook de pagos + Emails transaccionales

---

## Contexto
Multi-tenancy ya está implementado (Orden 1 completada).
Ahora necesitamos el sistema de cobro y emails para que los clientes paguen
y reciban comunicaciones automáticas.

Diego ya tiene cuenta en Rebill (rebill.com).
El plan de SOLVEN en Rebill debe configurarse manualmente desde el dashboard
de Rebill (no desde código) — el agente NO hace eso.

Lo que SÍ hace el agente:
1. Modelo Subscription en Prisma
2. Webhook endpoint para recibir eventos de Rebill
3. Middleware que bloquea acceso si la suscripción está vencida
4. Emails transaccionales con Resend
5. Banner de trial en el dashboard

---

## PASO 1 — Modelo Subscription en Prisma

Agregar en `prisma/schema.prisma`:

```prisma
model Subscription {
  id                 String             @id @default(cuid())
  tenantId           String             @unique
  tenant             Tenant             @relation(fields: [tenantId], references: [id])
  rebillSubscriptionId String?          @unique
  status             SubscriptionStatus @default(TRIAL)
  trialEndsAt        DateTime?
  currentPeriodEnd   DateTime?
  cancelledAt        DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}
```

Agregar relación en Tenant: `subscription Subscription?`

Correr: `npx prisma migrate dev --name add-subscription`

Al crear un Tenant nuevo (en /api/auth/register), crear automáticamente una
Subscription con status TRIAL y trialEndsAt = ahora + 14 días.

---

## PASO 2 — Webhook de Rebill

Crear `src/app/api/webhooks/rebill/route.ts`:

```typescript
export async function POST(request: Request) {
  // 1. Leer el body como texto raw (necesario para verificar HMAC)
  // 2. Verificar la firma HMAC con REBILL_WEBHOOK_SECRET
  //    - Header: x-rebill-signature
  //    - Algoritmo: HMAC-SHA256 del body raw
  //    - Si no coincide: return 401
  // 3. Parsear el evento JSON
  // 4. Manejar según event.type:
}
```

Manejar estos eventos:

**`subscription.activated`** o **`subscription.created`**:
- Buscar el Tenant por el email que viene en event.data.customer.email
- Actualizar su Subscription: status = ACTIVE, rebillSubscriptionId = event.data.id
- Enviar email de bienvenida

**`payment.success`** o **`invoice.paid`**:
- Actualizar currentPeriodEnd en Subscription
- status = ACTIVE si era PAST_DUE

**`payment.failed`** o **`invoice.payment_failed`**:
- status = PAST_DUE
- Enviar email de pago fallido

**`subscription.cancelled`**:
- status = CANCELLED, cancelledAt = ahora
- Enviar email de cancelación

**`subscription.trial_will_end`**:
- Enviar email de recordatorio (trial termina en 3 días)

Siempre retornar `{ received: true }` con status 200.

---

## PASO 3 — Middleware: bloquear acceso si suscripción vencida

En `src/middleware.ts`, después de verificar la sesión:

- Consultar la Subscription del tenant
- Si status es CANCELLED o EXPIRED → redirigir a /suscripcion-vencida
- Si status es TRIAL y trialEndsAt < ahora → cambiar status a EXPIRED, redirigir a /suscripcion-vencida
- Si status es PAST_DUE → permitir acceso pero mostrar banner (no bloquear todavía)
- Rutas que siempre pasan: /login, /register, /suscripcion-vencida, /api/webhooks/rebill

---

## PASO 4 — Página /suscripcion-vencida

Crear `src/app/suscripcion-vencida/page.tsx`:
- Mensaje claro: "Tu período de prueba terminó" o "Tu suscripción fue cancelada"
- Botón principal: "Renovar suscripción" → link al checkout de Rebill
  (usar placeholder URL: `process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL`)
- Link secundario: "Contactar soporte" → mailto:orgsolucionestecnologicas@gmail.com
- Botón de logout

---

## PASO 5 — Emails transaccionales con Resend

Instalar: `npm install resend`

Crear `src/lib/email.ts` con las siguientes funciones:

```typescript
// Configuración
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'SOLVEN <no-reply@solven.app>';

// Emails a implementar:
sendWelcomeEmail(to: string, businessName: string): Promise<void>
sendTrialEndingEmail(to: string, businessName: string, daysLeft: number): Promise<void>
sendPaymentFailedEmail(to: string, businessName: string): Promise<void>
sendCancellationEmail(to: string, businessName: string): Promise<void>
```

Cada email debe tener:
- Asunto claro en español
- HTML simple con el branding de SOLVEN (fondo blanco, acento naranja #E85D04, fuente sans-serif)
- Nombre del negocio personalizado
- CTA relevante (renovar, actualizar tarjeta, etc.)
- Footer con "SOLVEN — Gestión Comercial | orgsolucionestecnologicas@gmail.com"

Si RESEND_API_KEY no está configurado, logear un warning y no fallar
(para que el desarrollo local funcione sin Resend).

---

## PASO 6 — Banner de trial en el dashboard

En `src/app/ui/app-shell.tsx` (o el layout del dashboard):

Agregar un banner visible arriba de todo si:
- La suscripción está en TRIAL y quedan ≤ 7 días
- La suscripción está en PAST_DUE

Banner TRIAL (amarillo): "⏳ Tu prueba gratuita vence en X días · [Activar suscripción →]"
Banner PAST_DUE (rojo): "⚠️ Tu pago falló · Actualizá tu método de pago para continuar · [Actualizar →]"

Obtener el estado de la suscripción con un fetch a GET /api/subscription
(crear ese endpoint que devuelva { status, trialEndsAt, daysLeft }).

---

## Variables de entorno necesarias

Agregar a `.env` local (y a Vercel cuando estén disponibles):
```
REBILL_WEBHOOK_SECRET=     # secreto HMAC del dashboard de Rebill
REBILL_API_KEY=            # API key de Rebill
RESEND_API_KEY=            # API key de Resend (resend.com)
NEXT_PUBLIC_REBILL_CHECKOUT_URL=  # URL del checkout de Rebill para SOLVEN
```

Documentar estas 4 variables en un archivo `ENV_VARS.md` en la raíz del proyecto
para que Diego las complete con los valores reales del dashboard.

---

## Criterio de éxito

- Al registrarse, el Tenant tiene una Subscription en TRIAL por 14 días
- El webhook recibe eventos de Rebill y actualiza el estado correctamente
- Si el trial vence, el usuario es redirigido a /suscripcion-vencida
- El dashboard muestra el banner de trial cuando quedan ≤ 7 días
- Los emails se envían correctamente (o logean warning si no hay API key)
- `npm test` pasa sin errores
- Lint y typecheck limpios

---

## Cuando termines

Escribí el resultado en `REPORTE_AGENTE.md`:

```
# REPORTE — T14+T23+T26
## Estado: COMPLETADO / ERROR
## Migraciones corridas:
## Archivos creados:
## Archivos modificados:
## Tests: X pasando
## Observaciones:
```

Luego borrá este archivo `ORDEN_AGENTE.md`.
