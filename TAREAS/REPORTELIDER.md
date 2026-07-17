# REPORTE LÍDER — SOLVEN

> Log resumido para el Ingeniero Líder (Claude Cowork). Acá va **solo lo esencial**, no el detalle — el detalle completo de cada tarea vive en `REPORTE_DE_CAMBIOS.md` (features) o `QA_REPORTE.md` (QA/fixes). Este archivo es lo que el Ingeniero Líder lee primero para tener una foto rápida de todo lo que se fue generando, sin tener que abrir cada reporte detallado.
>
> Una entrada corta (2-4 líneas máximo) por cada tarea u orden ejecutada, del más reciente al más antiguo. **No se borra ni se archiva entre ciclos** — es un log acumulativo permanente.

---

<!-- El agente irá agregando entradas acá debajo, del más reciente al más antiguo -->

### 2026-07-17 — UI-01: Devoluciones pasó de menú principal a pestaña dentro de Ventas
Reorganización de UI pedida por Diego, no un bug. Se sacó "Devoluciones" del nav y de su ruta standalone (`/returns`, eliminada), y ahora vive como tercera pestaña en `Pos` (`Venta actual` / `Historial` / `Devoluciones`), reutilizando el componente `Returns` sin su header de página completa. La visibilidad por rol se preservó exacta (misma fórmula que `visibleNavItems` de `app-shell.tsx`). `typecheck`/`lint`/`test` sin errores (228 passed, incluida la prueba de concurrencia que QA-FIX-06 dejó estable). Detalle en `REPORTE_DE_CAMBIOS.md`.

### 2026-07-17 — Cierre y archivo de QA_REPORTE.md (ciclo de QA 1)
Releído completo el reporte original de QA (10 hallazgos: 2 críticos, 3 altos, 4 medios + 1 surgido como efecto colateral, 2 bajos). Los 9 que eran bugs reales quedaron resueltos y verificados vía QA-FIX-01 a 04; el único punto que sigue "abierto" (gastos recurrentes sin pantalla de gestión) nunca fue un bug — es una feature fuera de alcance, a criterio de Diego. Se archiva `TAREAS/QA_REPORTE.md`: el detalle técnico completo de cada hallazgo queda preservado en el historial de git de los commits QA-FIX-01 a 04. Ciclo de QA 1 cerrado por completo.

### 2026-07-17 — QA-FIX-06: error crudo de Prisma en pagos de deuda concurrentes
Cierra el riesgo detectado al verificar QA-FIX-05. Se reprodujo el código real (`P2028`, "Unable to start a transaction in the given time") en 5 de 10 corridas aisladas del test de concurrencia; en las 10 corridas la integridad de datos se mantuvo intacta (sin sobrepago real). Se amplió el `catch` de `registerDebtPayment` para tratar `P2028` igual que `P2034` (reintento y luego `DebtPaymentAmountError`), sin tocar el `updateMany` que protege la plata. `typecheck`/`lint` sin errores; test corrido 5 veces tras el fix, 5/5 OK. Detalle en `REPORTE_DE_CAMBIOS.md`.

### 2026-07-17 — QA-FIX-05: POS no volvía a pedir vendedor/comprobante tras cobrar
Bug nuevo (fuera del ciclo de QA, reportado por Diego en uso real). `submitSale()` en `pos.tsx` reseteaba el carrito tras una venta pero no `saleGateResult`, permitiendo cobrar de nuevo con el vendedor/comprobante de la venta anterior sin pasar por `SaleGateModal`. Fix de una línea (`setSaleGateResult(null)`), un solo archivo. `typecheck`/`lint` sin errores; `npm test` con la misma falla de concurrencia preexistente y no relacionada de QA-FIX-04 (esta vez también falló aislada, no solo en el suite completo — a seguir de cerca). Detalle en `REPORTE_DE_CAMBIOS.md`.

### 2026-07-16 — QA-FIX-04: ocultar CashRegisterIndicator para roles sin acceso a Caja
Cierra el último ítem abierto del ciclo de QA 1. `CashRegisterIndicator` (`app-shell.tsx`) ahora recibe `role`/`rolePermissions` y no renderiza nada (ni dispara los `fetch`) para roles sin acceso configurado a `cashMovements`, con el mismo default `OWNER`/`CASHIER` que usa el backend desde QA-FIX-03; `OWNER`/`CASHIER` no cambian. Sin test nuevo (no hay infraestructura de tests de componentes React en el proyecto). `npm run typecheck`/`lint` sin errores; `npm test` con una falla de concurrencia preexistente y no relacionada (confirmada flaky, pasa aislada). Detalle en `REPORTE_DE_CAMBIOS.md`.

### 2026-07-16 — QA-FIX-03: cierre de los 8 hallazgos 🟠/🟡/🟢 restantes del ciclo de QA
Los 8 ítems se resolvieron sin N/A: `GET` de Caja/Ajustes ahora exige rol (con tests 403 nuevos), scripts de seed/reset apuntan a un tenant demo fijo por id, columna/buscador de Clientes usan email/teléfono reales, el cron de cotizaciones usa la plantilla correcta, "Subir logo" en Ajustes ya persiste de verdad, se eliminó un test de venta a crédito desactualizado (cobertura ya existe en otro archivo), `/debts` y `/debt-payments` quedaron bajo la sección `customers` de RolePermission, y el límite de crédito en el panel de pago ya es el real del cliente. Se encontró un efecto colateral no pedido en el ítem 1: `CashRegisterIndicator` en `app-shell.tsx` llama a `/api/cash-movements` para todos los roles sin distinción, así que `SUPERVISOR`/`INVENTORY`/`READONLY` ahora ven un saldo de caja incorrecto en el sidebar (no crashea, solo muestra el monto de apertura) — no se tocó `app-shell.tsx` por estar fuera del alcance del lote, queda documentado para decisión de Diego. `npm run typecheck`, `npm run lint` y `npm test` (228 passed, 0 fallas) sin regresiones. Detalle completo en `REPORTE_DE_CAMBIOS.md`.

### 2026-07-16 — QA-FIX-02: RolePermission conectado a `requireRole` (decisión de Diego)
`requireRole(roles, section?)` ahora consulta `RolePermission` para bloquear roles no-OWNER cuando hay una fila `canAccess:false`; OWNER nunca puede quedar bloqueado. Se mapearon 27 endpoints de escritura a 6 de las 10 secciones (customers, products, cashMovements, quotes, returns, pos) siguiendo el mismo criterio que `app-shell.tsx` usa para la navegación; `promotions` y `settings` quedan sin efecto real porque sus endpoints son todos OWNER-only. Dos casos ambiguos (`/api/debt-payments`, `/api/debts`) quedaron sin sección y marcados "pendiente de confirmar con Diego". Typecheck y tests (220 pass, 2 fallas preexistentes no relacionadas) corridos dos veces sin regresiones. Detalle completo en `REPORTE_DE_CAMBIOS.md`.

### 2026-07-16 — QA-FIX-01: 9 endpoints sin control de rol, corregidos
Se agregó `requireRole(...)` a los 9 endpoints de escritura (debts, customers/[id], categories, subcategories, services, recurring-expenses) que sólo validaban tenant, no rol — cualquier usuario autenticado podía escribir sin importar su permiso. Verificado con typecheck, tests (212 pass, 0 regresiones) y prueba en vivo con token READONLY: los 9 devuelven 403. Detalle completo en `REPORTE_DE_CAMBIOS.md`.
