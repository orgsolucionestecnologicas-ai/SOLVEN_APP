# Variables de entorno — SOLVEN

## Variables a configurar en Vercel y en .env.local

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `REBILL_WEBHOOK_SECRET` | Secreto HMAC para verificar webhooks de Rebill | Dashboard de Rebill → Webhooks → Signing secret |
| `REBILL_API_KEY` | API key de Rebill para integración futura | Dashboard de Rebill → Developers → API Keys |
| `RESEND_API_KEY` | API key de Resend para emails transaccionales | resend.com → Settings → API Keys |
| `NEXT_PUBLIC_REBILL_CHECKOUT_URL` | URL del checkout de Rebill para el plan de SOLVEN | Dashboard de Rebill → Plans → [plan] → Checkout URL |

## Agregar al .env local

```
REBILL_WEBHOOK_SECRET=
REBILL_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_REBILL_CHECKOUT_URL=
```

## Notas

- `RESEND_API_KEY` no es obligatoria para desarrollo local. Si no está configurada, los emails se logean como warning y no fallan.
- `REBILL_WEBHOOK_SECRET` no es obligatoria para desarrollo local. Si no está configurada, el webhook acepta todas las peticiones (solo en dev).
- `NEXT_PUBLIC_REBILL_CHECKOUT_URL` es pública (accesible desde el browser). El prefijo `NEXT_PUBLIC_` es necesario.
- Configurar todas las variables en el dashboard de Vercel antes del lanzamiento.
