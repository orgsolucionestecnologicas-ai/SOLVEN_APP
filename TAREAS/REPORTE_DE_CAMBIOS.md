# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## 2026-07-23 — DESIGN-01: pulido visual de estilo, toda la app, una sola pasada (Fable)

**Rama:** `design/pulido-estilo-fable` (NO mergeada a `main` — esperar revisión del preview de Vercel por Diego). 6 commits: `d60d16b` (lenguaje de estilo), `ce418c5` (shell/dashboard/reportes/paginación), `5d90522` (formularios), `49972a1` (listados), `6b34f56` (POS/devoluciones/promos/servicios/ajustes), + este de docs.

**Lenguaje de estilo definido** (documentado en `docs/estilo-ui.md` nuevo + comentario en `globals.css`):
- Radios en 4 niveles: tarjetas/modales `rounded-2xl` · dropdowns/popovers `rounded-xl` · botones/inputs/chips/cajas anidadas `rounded-lg` · pills/avatares `rounded-full`. `rounded-md` eliminado de toda la app.
- Tarjeta estándar: `border border-slate-100 bg-white shadow-sm` con padding `p-5` (antes mezcla de `p-4`, bordes `slate-200` y radios inconsistentes).
- Dropdowns conservan `border-slate-200 + shadow-lg` (flotan); modales `shadow-xl` sin borde.
- KPIs: `text-2xl font-semibold tracking-tight text-slate-900` (antes `font-bold` mezclado con `slate-950`), delta chico al lado.

**Cambios transversales (los 29 archivos con clases tocadas en `src/app/ui/`):**
- Normalización mecánica de radios/sombras/bordes/padding de tarjetas según el lenguaje — solo strings de `className`, cero cambios de JSX estructural, props, lógica o datos.
- `app-shell.tsx`: el área de contenido (`<main>`) pasó de `bg-white` a `bg-slate-50` — las tarjetas blancas ahora flotan sobre canvas gris claro como en la imagen de referencia; header de página con `bg-white` y título `tracking-tight`. **El sidebar oscuro no se tocó.**
- `globals.css`: fondo blanco por defecto para `input/select/textarea` con especificidad mínima (elemento), para que los inputs sin `bg-*` explícito no se vean grises sobre el nuevo canvas; cualquier utilidad `bg-*` lo pisa (POS dark mode intacto).
- `pagination.tsx`: estaba tematizada para fondo oscuro (`border-gray-800`, `text-gray-300`, `hover:bg-gray-800`) pero se usa solo en `sales-list` sobre fondo claro — repintada al lenguaje claro (mismo markup).
- `cuenta-subscription.tsx`: tarjetas `bg-slate-50` (invisibles sobre el nuevo canvas) → tarjeta estándar blanca.
- Skeletons de carga alineados al radio de la tarjeta que imitan.

**No tocado (por regla de la orden):** `src/modules/*`, `src/app/api/*`, `prisma/*`, `middleware.ts`, `tenant.ts`, `auth.ts`, `NoaChat.tsx`, sidebar oscuro, los 3 PDFs (`quote-pdf`, `report-pdf`, `return-credit-note-pdf`), tests. Violeta `#7c3aed` y naranja `PAST_DUE` intactos.

**Incidente durante la ejecución (resuelto):** la pasada mecánica corrompió 2 líneas de `customer-detail.tsx` (un ` shadow-sm` insertado fuera de un string de clases por un desbalance de backticks en el script). Detectado por `typecheck`, corregido a mano, y el diff completo del archivo re-auditado línea por línea.

**Validación:** `lint` 0 errores · `typecheck` 0 errores · `npm test` 323 passed / 2 skipped (los mismos números que antes de la orden — ningún test se rompió por cambios de clase).

**Pendiente de decisión de Diego:** revisar el preview de Vercel de la rama y, si aprueba, mergear a `main`.

---
