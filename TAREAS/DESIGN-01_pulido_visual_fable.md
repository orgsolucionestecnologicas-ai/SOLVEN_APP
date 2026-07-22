# DESIGN-01 — Pulido visual de estilo, toda la app, una sola pasada (Fable)

> Orden especial y única. La ejecuta el Ingeniero Senior de Diseño UI/UX corriendo en Claude Fable, dentro de VS Code, aprovechando una asignación de uso que Anthropic dio por única vez. No hay una segunda pasada — tiene que quedar completo y bien hecho ahora.

## 0 — Qué NO es esta orden

Esto **no es un rediseño**. Es un **pulido de estilo**: tipografía, espaciado, sombras, radios de borde, tratamiento de tarjetas y gráficos. La estructura, el layout, la navegación y los colores de marca de cada pantalla **se quedan exactamente como están**. Se adjunta una imagen de referencia (mockup de "Reportes" con estética pulida: tarjetas blancas, esquinas redondeadas grandes, sombra suave, badges de ícono en violeta clarito, gráficos en tonos violeta, buen aire entre elementos). **Esa imagen es una guía de dirección estética, no una plantilla a copiar literal.** No hay que reproducir ese layout de Reportes pantalla por pantalla — hay que extraer el *lenguaje visual* (nivel de pulido, consistencia de radios/sombras/espaciado/tipografía) y aplicarlo sobre el layout que YA EXISTE en cada pantalla de SOLVEN.

**Ley absoluta, sin excepción:** cero cambios de lógica, de datos, de estructura de componentes, de rutas, de validaciones, de queries, de tests funcionales. Si en algún punto dudás si un cambio es "solo estilo" o ya es "estructura/lógica", no lo hagas — dejalo documentado en el reporte y seguí con lo siguiente. Un cambio visual mal hecho se revierte fácil; un cambio de lógica mal hecho puede romper datos reales de clientes reales en producción.

## 1 — Qué SÍ podés tocar

- Clases de Tailwind (`className`) en todos los componentes de `src/app/ui/*.tsx`.
- `src/app/globals.css` (tipografía, variables de color si hace falta, utilidades compartidas).
- Envolver JSX existente en contenedores puramente presentacionales (ej. un `<div>` de tarjeta) — sin mover lógica, sin cambiar props, sin tocar el orden de renderizado de datos.
- Crear componentes de presentación puros y reutilizables si ayuda a la consistencia (ej. un `<Card>` compartido) — siempre que no reciban ni transformen datos de negocio, solo reciban `children`/props visuales.

## 2 — Qué NUNCA podés tocar

- Nada en `src/modules/*` (validación, data-access, lógica de negocio).
- Nada en `src/app/api/*` (route handlers).
- Nada en `prisma/schema.prisma` ni migraciones.
- `src/lib/tenant.ts`, `src/lib/auth.ts`, `src/middleware.ts`.
- La barra lateral (`app-shell.tsx`, elemento `<aside>`, `bg-slate-900`) y sus acentos violeta — **se queda tal cual está, oscura**. Solo si hace falta un micro-ajuste de espaciado interno del sidebar por consistencia, es aceptable, pero el fondo oscuro y la estructura de navegación no cambian.
- `src/components/noa/NoaChat.tsx` — no tocar, es de otro dominio (NOA ventas, landing).
- El violeta primario `#7c3aed` no se reemplaza — se usa como acento (ya lo es), no hace falta y no hay que forzarlo como fondo sólido en todos lados.
- El naranja `#E85D04` sigue siendo exclusivo del estado `PAST_DUE` de suscripción — no usarlo como color decorativo nuevo.
- Ningún archivo `.test.ts`/`.test.tsx` — si un test se rompe por un cambio de clase CSS pura (raro, pero puede pasar si algún test hace snapshot de className), ajustalo mínimamente; si un test se rompe por cualquier otra razón, parar y reportarlo, no forzar el cambio.

## 3 — Línea base actual (para no partir de cero)

Hoy el proyecto ya usa Tailwind con violeta como color de marca, pero de forma inconsistente: mezcla `rounded-lg`, `rounded-xl`, `rounded-md`, `rounded-full` y mayormente `shadow-sm` (con algunos `shadow-lg`/`shadow-xl` sueltos) sin un criterio único de cuándo usar cada uno. Tipografía: `DM Sans` (cuerpo) y `Sora` (títulos), ya cargadas en `globals.css` — no hace falta traer fuentes nuevas, pulir el uso de tamaños/pesos existentes.

**Primer paso de la orden (antes de tocar pantallas):** definir un lenguaje de estilo único y documentarlo en un comentario al principio de `globals.css` o en un archivo `docs/estilo-ui.md` corto — algo así:
- Radio de borde estándar para tarjetas de contenido (elegir uno, ej. `rounded-2xl`, y aplicarlo consistente).
- Sombra estándar para tarjetas (ej. `shadow-sm` con un `border border-slate-100` sutil, como se ve en la imagen de referencia).
- Espaciado interno estándar de tarjetas (padding consistente).
- Tratamiento de badges de ícono (círculo con fondo violeta clarito tipo `bg-violet-100 text-violet-600`, como en la imagen).
- Jerarquía tipográfica (tamaño de número grande destacado + variación porcentual chica, tal como en la imagen de Reportes) para métricas/KPIs en todas las pantallas que las tengan (dashboard, reportes, y cualquier otra con tarjetas de números).

Una vez definido ese lenguaje, aplicarlo consistentemente en las 37 pantallas de `src/app/ui/`:
```
app-shell.tsx (solo el área de contenido, NO el sidebar oscuro)
cash-movement-form.tsx, cash-movements-list.tsx
cash-register-close.tsx, cash-register-open.tsx
cuenta-subscription.tsx
customer-detail.tsx, customer-new-form.tsx, customer-payment-form.tsx, customers-list.tsx
dashboard-summary.tsx
debts-list.tsx
expenses-list.tsx
help-page.tsx
inventory-adjust-form.tsx, inventory-entry-form.tsx
onboarding-wizard.tsx
pagination.tsx
pos.tsx
product-detail.tsx, product-form.tsx, products-inventory.tsx
promotions.tsx
quotes-list.tsx (quote-pdf.tsx y report-pdf.tsx y return-credit-note-pdf.tsx son PDFs — no tocar, otro sistema de render)
reports.tsx  ← pantalla de referencia de la imagen, la de mayor cuidado
returns.tsx
role-permissions-table.tsx
sale-gate-modal.tsx
sales-list.tsx
services.tsx
settings.tsx
switch-cashier-modal.tsx
unanswered-queries.tsx
user-avatar.tsx
users-list.tsx
```

## 4 — Seguridad del cambio (por qué es tan grande)

Por ser un pase sobre casi toda la app, **no se trabaja directo sobre `main`**. Crear una rama nueva:
```
git checkout -b design/pulido-estilo-fable
```
Commitear por pantalla o por grupo chico de pantallas relacionadas (no un solo commit gigante) — así cualquier cosa se puede revisar o revertir sin perder todo el trabajo. Cada commit igual debe pasar `npm run typecheck` y `npm run lint` antes de hacerse. Al terminar TODA la pasada, push de la rama (`git push origin design/pulido-estilo-fable`) — **no mergear a `main` sin que Diego revise el preview de Vercel primero.**

## 5 — Reporte

Mismo protocolo de siempre: actualizar `TAREAS/REPORTE_DE_CAMBIOS.md` (detalle de qué se tocó, pantalla por pantalla o por lote) y agregar una entrada a `TAREAS/REPORTELIDER.md` al final (resumen de 2-4 líneas: qué se hizo, qué lenguaje de estilo se definió, cuántas pantallas se tocaron, si typecheck/lint pasaron limpio). No escribir que el Ingeniero Líder ya revisó esto — eso lo agrega el Ingeniero Líder después de revisar el diff completo.

## 6 — Recordatorio final

Es la única pasada. No dejes pantallas sin tocar por quedarte sin tiempo en las primeras — si hay que priorizar, priorizá terminar las 37 con el lenguaje de estilo aplicado de forma pareja, antes que perfeccionar una sola pantalla al detalle extremo. Consistencia entre pantallas > perfección en una sola.
