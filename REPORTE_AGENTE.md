# Reporte de agente — Corrección de diseño: colores, logo y flujo "Ver planes"

## Cambio 1 — `src/app/suscripcion-vencida/page.tsx`
- Reemplazados todos los colores naranja por violeta: `bg-orange-100`→`bg-violet-100`, `text-orange-600`→`text-violet-600`, `bg-orange-500`→`bg-violet-600`, `hover:bg-orange-600`→`hover:bg-violet-700`.
- Reemplazado el bloque del ícono de alerta por el logo SOLVEN (cuadro violeta con "S" + texto "SOLVEN") seguido del ícono `AlertCircle` en violeta.
- Botón "Renovar suscripción →" no se tocó (ya apuntaba correctamente a `NEXT_PUBLIC_REBILL_CHECKOUT_URL`).
Resultado: OK.

## Cambio 2 — `src/app/pricing/page.tsx`
- Reescritura completa según especificación de la orden: fondo `slate-950`/`slate-900`, logo SOLVEN real (cuadro violeta + texto, sin el hexágono naranja), acentos en `violet-400`/`violet-600`.
- Componente convertido a `async` y usa `getSession()` de `@/lib/tenant` para detectar autenticación (`isAuthenticated`).
- CTA condicional: usuario autenticado ve "Suscribirme ahora →" (abre `NEXT_PUBLIC_REBILL_CHECKOUT_URL` en pestaña nueva); usuario no autenticado ve "Empezar gratis 14 días" (va a `/register`).
- Footer condicional: autenticado ve "← Volver al panel" (`/dashboard`); no autenticado ve "¿Ya tenés cuenta? Iniciá sesión" (`/login`).
Resultado: OK.

## Cambio 3 — `src/app/ui/cuenta-subscription.tsx`
- Botón "Ver planes disponibles" (naranja, iba a `/pricing`) reemplazado por "Ver planes y suscribirse" (violeta), que ahora abre directamente `process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL` (con fallback a `/pricing`) en una pestaña nueva (`target="_blank"`).
- `CreditCard` ya estaba importado — no se tocó el import.
Resultado: OK.

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin warnings
- `npm run build`: compila sin errores (`/pricing` ahora es ruta dinámica `ƒ` por usar `getSession()`, esperado)

## Commit
`fix(ui): colores violeta en suscripcion-vencida y pricing, logo correcto, CTA autenticado va a checkout Rebill`
