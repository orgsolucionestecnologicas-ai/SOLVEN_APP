# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## 2026-07-23 — DESIGN-02: correcciones sobre DESIGN-01 (pulido visual)

**Rama:** `design/pulido-estilo-fable` (la misma de DESIGN-01, NO se creó rama nueva; sigue sin mergear a `main`). 2 commits de código + 1 de docs: `60a2337` (estilo de role-permissions-table), `fd71f3b` (fix de mojibake en settings y sales-list), + este de reportes.

Son las 2 correcciones puntuales que pidió la orden tras la verificación independiente de DESIGN-01. No es una pasada nueva.

### Problema 1 — 4 pantallas figuraban sin tocar

De las 4 listadas, solo 1 tenía contenido estilable:

- **`role-permissions-table.tsx`** — se aplicó el lenguaje de `docs/estilo-ui.md`, solo `className`:
  - Contenedor de la tabla: `rounded-xl border border-slate-200` → `rounded-2xl border border-slate-100 bg-white shadow-sm` (idéntico al patrón del `UsersList` que se renderiza justo arriba, en el mismo `UsuariosPanel`).
  - Título de sección: `text-slate-950` → `text-slate-900` (consistente con el resto de títulos de la pasada).
  - `thead`/`tbody`/caja de error ya coincidían con el lenguaje — no se tocaron.
  - Se verificó antes de tocar (`git status` + `git diff main`): el archivo estaba idéntico a `main`, sin WIP ajeno de la feature de permisos por rol. Sin conflicto.
- **`help-page.tsx`** y **`unanswered-queries.tsx`** — son stubs de **una sola línea** (`// Eliminado — …`), sin JSX ni clases. No hay nada que estilar. No se tocaron (no forzar cambios sin sentido).
- **`user-avatar.tsx`** — ya cumple el lenguaje: avatar `rounded-full`, fondo violeta primario `bg-violet-600`. No requería cambios.

Por eso `help-page.tsx`, `unanswered-queries.tsx` y `user-avatar.tsx` **no aparecen** en `git diff main...HEAD --stat` — es el resultado correcto, no un olvido.

### Problema 2 — corrupción de encoding (mojibake), bug real no cosmético

La pasada mecánica de DESIGN-01 guardó texto en español con doble codificación UTF-8→CP1252, dejando `¡ ¿ — · … í ó ñ …` como `Â¡ Â¿ â€" Â· â€¦ Ã­ Ã³ Ã±`. Se vería roto para el usuario.

- **`settings.tsx`** y **`sales-list.tsx`** — texto restaurado a UTF-8 correcto. `sales-list.tsx` estaba **doble-codificado a nivel de bytes** (`ó` guardado como `C3 83 C2 B3`), y contenía casos con la ranura CP1252 indefinida `0x8D` (la `Í` de `"Ítem"`) que pasó como control C1 — ambos contemplados en la reversión.
- Método: reversión determinística (decodificar como UTF-8 → re-encodear como CP1252 → decodificar como UTF-8), disparada solo en secuencias que empiezan con los chars de arranque de mojibake (`Â Ã â`), nunca sobre letras españolas correctas.
- **Verificación de que no se alteró ningún texto legítimo:** comparando cada archivo corregido contra `main` tras neutralizar las clases, el texto quedó **idéntico a `main`** (0 diferencias de texto; las únicas diferencias reales vs `main` son los cambios de clase de DESIGN-01). El texto de `main` (previo a DESIGN-01) es la referencia correcta.
- El grep obligatorio de la orden sobre el diff completo de la rama vs `main` (`grep -nE "^\+.*(Â|â€|Ã[^ -])"`) **no devuelve nada** en `src/`. Barrido adicional de todo `src/`: sin mojibake ni caracteres de control C1 en ningún otro archivo.

### No tocado (regla de la orden, sigue vigente de DESIGN-01)
`src/modules/*`, `src/app/api/*`, `prisma/*`, `middleware.ts`, `tenant.ts`, `auth.ts`, `NoaChat.tsx`, sidebar oscuro, los 3 PDFs, tests. Violeta `#7c3aed` y naranja `PAST_DUE` intactos.

### Validación
`lint` 0 · `typecheck` 0 · `npm test` 323 passed / 2 skipped (los mismos números que DESIGN-01 — ningún test se rompió).

**Pendiente de decisión de Diego:** revisar el preview de Vercel de la rama y, si aprueba, mergear a `main`.

---

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
