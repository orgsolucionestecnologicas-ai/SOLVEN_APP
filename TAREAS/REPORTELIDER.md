# REPORTE LÍDER — SOLVEN

> Log resumido para el Ingeniero Líder (Claude Cowork). Acá va **solo lo esencial**, no el detalle — el detalle completo de cada tarea vive en `REPORTE_DE_CAMBIOS.md` (features) o `QA_REPORTE.md` (QA/fixes). Este archivo es lo que el Ingeniero Líder lee primero para tener una foto rápida de todo lo que se fue generando, sin tener que abrir cada reporte detallado.
>
> Una entrada corta (2-4 líneas máximo) por cada tarea u orden ejecutada, del más reciente al más antiguo. **No se borra ni se archiva entre ciclos** — es un log acumulativo permanente.

---

<!-- El agente irá agregando entradas acá debajo, del más reciente al más antiguo -->

### 2026-07-16 — QA-FIX-02: RolePermission conectado a `requireRole` (decisión de Diego)
`requireRole(roles, section?)` ahora consulta `RolePermission` para bloquear roles no-OWNER cuando hay una fila `canAccess:false`; OWNER nunca puede quedar bloqueado. Se mapearon 27 endpoints de escritura a 6 de las 10 secciones (customers, products, cashMovements, quotes, returns, pos) siguiendo el mismo criterio que `app-shell.tsx` usa para la navegación; `promotions` y `settings` quedan sin efecto real porque sus endpoints son todos OWNER-only. Dos casos ambiguos (`/api/debt-payments`, `/api/debts`) quedaron sin sección y marcados "pendiente de confirmar con Diego". Typecheck y tests (220 pass, 2 fallas preexistentes no relacionadas) corridos dos veces sin regresiones. Detalle completo en `REPORTE_DE_CAMBIOS.md`.

### 2026-07-16 — QA-FIX-01: 9 endpoints sin control de rol, corregidos
Se agregó `requireRole(...)` a los 9 endpoints de escritura (debts, customers/[id], categories, subcategories, services, recurring-expenses) que sólo validaban tenant, no rol — cualquier usuario autenticado podía escribir sin importar su permiso. Verificado con typecheck, tests (212 pass, 0 regresiones) y prueba en vivo con token READONLY: los 9 devuelven 403. Detalle completo en `REPORTE_DE_CAMBIOS.md`.

