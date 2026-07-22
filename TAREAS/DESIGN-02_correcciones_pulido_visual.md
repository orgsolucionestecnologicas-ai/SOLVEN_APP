# DESIGN-02 — Correcciones sobre DESIGN-01 (pulido visual)

> Ejecuta el Ingeniero Líder (Opus 4.8) sobre la misma rama `design/pulido-estilo-fable`.
> No es una pasada nueva ni un nuevo alcance: son 2 correcciones puntuales sobre lo que dejó DESIGN-01, encontradas en la verificación independiente.

## 0 — Contexto

`DESIGN-01` corrió sobre la rama `design/pulido-estilo-fable` (6 commits, no mergeada a `main`). Se verificó el diff completo contra `main`, se re-corrió `typecheck`/`lint` de forma independiente y se auditó a nivel de bytes. Confirmado: cero cambios en `src/modules/*`, `src/app/api/*`, `prisma/*`, `middleware.ts`, `tenant.ts`, `auth.ts`; el sidebar oscuro no se tocó (`<aside>` intacto, solo `<main>` cambió de `bg-white` a `bg-slate-50`); el incidente de `customer-detail.tsx` quedó bien resuelto. Pero aparecieron 2 problemas que hay que cerrar antes de que Diego mire el preview de Vercel.

Seguí trabajando **sobre la misma rama**, no crear una rama nueva. Nuevos commits, no hace falta rehacer nada de lo ya hecho.

## 1 — Problema 1: 4 pantallas quedaron sin tocar

De las pantallas listadas en `TAREAS/DESIGN-01_pulido_visual_fable.md` (sección 3), estas 4 no tienen ningún cambio en el diff — siguen con el estilo viejo, inconsistente con el resto:

- `src/app/ui/help-page.tsx`
- `src/app/ui/role-permissions-table.tsx`
- `src/app/ui/unanswered-queries.tsx`
- `src/app/ui/user-avatar.tsx`

Aplicá el mismo lenguaje de estilo ya definido en `docs/estilo-ui.md` (radios en 4 niveles, tarjeta estándar `border border-slate-100 bg-white shadow-sm p-5`, tipografía de KPIs, etc.) a estos 4 archivos. Mismo criterio que el resto de la pasada: solo `className`, cero cambios de JSX estructural, props, lógica o datos.

**Atención con `role-permissions-table.tsx` puntualmente**: puede haber cambios sin commitear en `main` de otro trabajo en curso (feature de permisos por rol). Antes de tocarlo, correr `git status` y `git diff main -- src/app/ui/role-permissions-table.tsx` para entender si hay WIP ajeno en el working tree, y no pisar ese trabajo — si hay dudas, documentarlo en el reporte en vez de forzar el cambio.

## 2 — Problema 2: corrupción de encoding (esto es un bug real, no cosmético)

La pasada mecánica de DESIGN-01 corrompió el encoding de texto en español en 2 archivos — confirmado a nivel de bytes, no es un artefacto de visualización. Caracteres como `¡ ¿ — · … í ó` quedaron guardados como su versión mal decodificada (`Â¡ Â¿ â€” Â· â€¦ Ã­ Ã³`). Esto se vería roto en pantalla para un usuario real.

Archivos afectados:
- `src/app/ui/settings.tsx` (33 líneas) — incluye el placeholder/valor por defecto `"Â¡Gracias por su compra!"` (debe ser `"¡Gracias por su compra!"`), separadores `â€"` en la vista previa del ticket y en `AutenticaciÃ³n`, `DÃ³lar`, `AlÃ­cuota`, `DevoluciÃ³n`, etc.
- `src/app/ui/sales-list.tsx` (12 líneas) — mismo patrón (`Â·`, `Ã—`, `Ãtem`, etc.)

Corregí estas cadenas a su texto correcto en UTF-8 (el original en `main` antes de DESIGN-01 tiene la versión correcta — usalo de referencia con `git show main:src/app/ui/settings.tsx` y `git show main:src/app/ui/sales-list.tsx`). No es necesario tocar nada más de esos archivos, solo restaurar el texto corrompido.

**Paso obligatorio de validación** (esto no lo detecta `typecheck` ni `lint` porque son strings, no sintaxis): antes de cerrar, correr sobre el diff completo de la rama contra `main`:

```
git diff main...design/pulido-estilo-fable | grep -nE "^\+.*(Â|â€|Ã[^ -])"
```

Si aparece algún resultado fuera de los 2 archivos ya identificados, corregirlo también. El objetivo es que este grep no devuelva nada al terminar.

## 3 — Validación final

- `npm run typecheck` y `npm run lint` limpios (0 errores) — igual que ya reportó DESIGN-01, no debería romperse con estos cambios.
- `npm test` si el entorno lo permite.
- El grep de mojibake de la sección 2 sin resultados.
- Confirmar que `role-permissions-table.tsx`, `help-page.tsx`, `unanswered-queries.tsx`, `user-avatar.tsx` ahora sí aparecen en `git diff main...design/pulido-estilo-fable --stat`.

## 4 — Reporte

Mismo protocolo de siempre: actualizar `TAREAS/REPORTE_DE_CAMBIOS.md` (detallado) y `TAREAS/REPORTELIDER.md` (resumen corto). No escribir frases de autoverificación tipo "verificado por el Ingeniero Líder" — esa nota la agrega Diego/el Ingeniero Líder después de revisar.

Nota: `CLAUDE.md` ahora vive en `TAREAS/CLAUDE.md` (Diego lo movió ahí para tener todos los `.md` a mano). Si necesitás consultarlo, es esa la ruta actual, ya no la raíz del repo.

## 5 — Qué no cambia

Sigue vigente todo lo de `DESIGN-01`: no tocar `src/modules/*`, `src/app/api/*`, `prisma/*`, `middleware.ts`, `tenant.ts`, `auth.ts`, `NoaChat.tsx`, el sidebar oscuro, los 3 PDFs (`quote-pdf`, `report-pdf`, `return-credit-note-pdf`), tests (salvo fixes triviales de snapshot de className). Violeta `#7c3aed` y naranja de `PAST_DUE` intactos. No mergear a `main` — esta rama sigue esperando que Diego revise el preview de Vercel.
