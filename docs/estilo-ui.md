# Lenguaje de estilo UI — SOLVEN (DESIGN-01)

Guía única de pulido visual. Aplica a todos los componentes de `src/app/ui/*.tsx` (excepto PDFs y el sidebar oscuro de `app-shell.tsx`, que no se tocan). No define layout ni estructura — solo tratamiento visual.

## Escala de radios (4 niveles)

| Elemento | Radio |
|---|---|
| Tarjetas de contenido, modales, paneles principales | `rounded-2xl` |
| Dropdowns / popovers / autocompletes | `rounded-xl` |
| Botones, inputs, selects, chips, cajas anidadas dentro de tarjetas | `rounded-lg` |
| Pills de estado, avatares, badges de ícono | `rounded-full` |

`rounded-md` no se usa más — se reemplaza por `rounded-lg`.

## Sombras y bordes

| Elemento | Tratamiento |
|---|---|
| Tarjeta de contenido | `border border-slate-100 bg-white shadow-sm` |
| Dropdown / popover | `border border-slate-200 bg-white shadow-lg` (borde más marcado porque flota) |
| Modal | `bg-white shadow-xl` (sin borde, sobre overlay oscuro) |

## Espaciado de tarjetas

Padding interno estándar de tarjeta: `p-5` (antes se mezclaba `p-4`). Estados vacíos centrados pueden usar `p-8`. Cajas anidadas: `p-3`/`p-4`.

## Badges de ícono

Círculo con violeta claro: `flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600` (tamaño ajustable, colores fijos).

## Jerarquía tipográfica de KPIs

- Número grande: `text-2xl font-semibold tracking-tight text-slate-900` (no `font-bold`).
- Variación / delta: texto chico `text-xs`/`text-sm`, verde `emerald-600` para positivo, rojo `red-600`/`rose-600` para negativo, con flecha.
- Label de la métrica: `text-sm text-slate-500` (o `text-xs uppercase tracking-wide text-slate-500` en tablas).

## Fuentes

Las ya cargadas en `globals.css`: DM Sans (cuerpo), Sora (títulos `h1–h6`). No traer fuentes nuevas.

## Colores

- Violeta primario `#7c3aed` (violet-600): acento — botones primarios, links activos, gráficos. No forzarlo como fondo sólido masivo.
- Naranja `#E85D04`: exclusivo del estado `PAST_DUE` de suscripción (excepción: serie "gastos" en gráficos, `#f97316`).
- Fondo de app: `#f8fafc` (slate-50). Superficies: blanco.
- El sidebar oscuro (`bg-slate-900`) queda tal cual.
