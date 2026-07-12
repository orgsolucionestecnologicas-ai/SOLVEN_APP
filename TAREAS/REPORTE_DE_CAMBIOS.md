# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 087 — Exportar listado de deudas a CSV / Excel — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/debts-list.tsx`
**Cambios realizados:** Se agregó un botón "Exportar CSV" al inicio de la fila de filtros (mismo lugar y estilo que en `sales-list.tsx`/`cash-movements-list.tsx`). Genera el CSV en el cliente con el mismo patrón ya usado (`escapeCsvValue` + `Blob` + `URL.createObjectURL` + click programático + `revokeObjectURL`, sin librerías nuevas) a partir de `filteredDebts` (las deudas visibles según los filtros aplicados, no solo la página actual), con columnas Cliente, Deuda total, Saldo pendiente, Estado (Pendiente/Pagada/Vencida, reutilizando `isOverdueDebt` de la Tarea 084), Fecha de creación y Fecha de vencimiento. Descarga con nombre `deudas_YYYY-MM-DD.csv` (fecha actual).
**Notas:** No se modificó `/api/debts` ni el schema de Prisma. No existe archivo de test dedicado para `debts-list.tsx`. Build, lint y typecheck OK. `npm test`: 203 passed / 2 failed / 2 skipped — ambos fallos son preexistentes y no relacionados: `creates a credit sale with debt through the API flow` es el mismo bug ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito), y `prevents concurrent payments from overpaying a debt` es el mismo flake transitorio de Neon ya visto y confirmado en las Tareas 084 y 086. Esta tarea no tocó ningún archivo de backend/API, por lo que ninguno de los dos fallos puede ser una regresión introducida aquí.

---

## Tarea 086 — Fecha de vencimiento de deuda configurable al registrarla — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/debts-list.tsx`, `src/modules/debts/debt-validation.ts`, `src/modules/debts/debt-data-access.ts`, `src/modules/debts/debt-validation.test.ts`
**Cambios realizados:** El botón "Nueva deuda" (antes decorativo, sin `onClick`) ahora abre un nuevo componente `CreateDebtModal` con buscador de cliente con debounce (mismo patrón que `NewQuoteModal` en `quotes-list.tsx`, contra `GET /api/customers?search=...`), un campo de monto total obligatorio y un campo de fecha de vencimiento opcional (`<input type="date">`). Al confirmar hace `POST /api/debts` con `{ customerId, totalAmount, dueDate }`; al éxito cierra el modal y refresca la lista (mismo patrón `refreshKey` usado tras registrar un pago). Se agregó soporte para `dueDate` (opcional, valida que sea una fecha válida si viene) en `CreateDebtInput`/`validateCreateDebtInput`, y `createDebt` ahora persiste el campo agregado en la Tarea 084. No se modificó `/api/debts/route.ts` — ya pasaba el body completo a `createDebt` sin cambios necesarios. No se tocó cómo se generan las deudas automáticas desde ventas a crédito.
**Notas:** Build, lint y typecheck OK. Se actualizó el test unitario existente `debt-validation.test.ts` (el resultado de `validateCreateDebtInput` ahora incluye `dueDate`) y se agregaron 2 casos nuevos (fecha válida / fecha inválida). `npm test`: tras el ajuste, 203 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito). Dos fallos adicionales vistos en la corrida completa (`prevents concurrent payments from overpaying a debt` y `stock-adjustment` con timeout de transacción) fueron confirmados como flakes transitorios de Neon al re-ejecutarse en aislamiento — pasaron sin cambios de código.

---

## Tarea 085 — Total global adeudado visible en el encabezado de la sección — 2026-07-12
**Estado:** ✅ Ya estaba implementada — sin cambios
**Archivos modificados:** ninguno
**Verificación:** En `src/app/ui/debts-list.tsx`, la primera de las 4 tarjetas de métricas (`MetricCard` con ícono `AlertCircle` rojo, título "Total deuda") ya muestra `totalDebt` (suma de `remainingAmount` de todas las deudas) en `text-2xl font-bold`, justo debajo del encabezado "Deudas" de la sección. Es suficientemente prominente y no se mezcla con las otras 3 tarjetas. No se modificó `totalDebt`, `/api/debts` ni el schema de Prisma.

---

## Tarea 084 — Deudas vencidas automáticamente marcadas con badge 'Vencida' en rojo — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `prisma/schema.prisma`, `prisma/migrations/20260712190719_add_debt_due_date/`, `src/app/ui/debts-list.tsx`
**Cambios realizados:** Se agregó el campo opcional `dueDate DateTime?` al modelo `Debt` (migración `add-debt-due-date`, aplicada). En `debts-list.tsx` se agregó `dueDate: string | null` al tipo `DebtRecord` y una función `isOverdueDebt` con el criterio exacto `dueDate !== null && new Date(dueDate) < new Date() && Number(remainingAmount) > 0`. Cuando una deuda cumple ese criterio, la tabla principal y el detalle (`DebtDetailModal`) muestran un badge rojo "Vencida" en lugar de "Pendiente" en la columna/estado.
**Notas:** No se tocó `debt-data-access.ts` — `listDebts` usa `include` (no `select`) por lo que `dueDate` ya se devuelve automáticamente. No se agregó formulario para cargar `dueDate` (queda para la Tarea 086). Build, lint y typecheck OK. `npm test`: 199 passed / 4 failed / 2 skipped en la corrida completa, pero al re-ejecutar en aislamiento los 3 archivos de integración que fallaron (`dashboard/summary`, `products`, `debt-payment-data-access`) los 7 tests pasaron sin cambios — fueron cortes transitorios de conexión a Neon ("Can't reach database server"), no una regresión. El único fallo restante es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito).

---

## Tarea 083 — Confirmación de dos pasos con resumen antes de procesar la devolución — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/returns.tsx`
**Cambios realizados:** El botón "Procesar devolución" del formulario "Nueva devolución" ahora es "Revisar devolución" y no envía nada directamente — pasa a un paso intermedio dentro del mismo formulario (estado `formStep`, sin modal aparte) que muestra un resumen: productos a devolver con cantidad y si reponen o no stock, el motivo y nota seleccionados, y el monto total, con botones "Volver" (regresa al formulario conservando todo lo cargado: cantidades, motivo, nota, checkboxes de reposición) y "Confirmar devolución" (recién ahí dispara el `POST /api/returns` existente).
**Notas:** Build, lint y typecheck OK. No se modificó `processReturn` ni `/api/returns` ni el schema de Prisma. `npm test`: 202 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito).

---

## Tarea 082 — Advertencia si el producto ya tiene stock 0 y no puede reponerse — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/returns.tsx`
**Cambios realizados:** Al seleccionar una venta en "Nueva devolución", ahora se consulta el stock actual de cada producto involucrado vía `GET /api/products/[id]` (en paralelo, sin endpoint nuevo) y se guarda en el estado `productStockById`. Si el checkbox "Reponer al inventario" (Tarea 079) está destildado para un producto y su stock actual es 0, se muestra una advertencia ámbar con ícono `AlertTriangle` junto a la línea del producto: "Este producto ya está sin stock y no se repondrá — seguirá sin stock disponible para la venta." Es puramente informativa, no bloquea el envío.
**Notas:** Build, lint y typecheck OK. No se modificó `processReturn` ni `/api/returns`.

---

## Tarea 081 — Nota de crédito de la devolución en PDF descargable — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/return-credit-note-pdf.tsx` (nuevo), `src/app/api/returns/[id]/pdf/route.tsx` (nuevo), `src/modules/returns/index.ts` (agregada función `getReturnById`), `src/app/ui/returns.tsx`
**Cambios realizados:** Se replicó el patrón de PDF de cotizaciones (`@react-pdf/renderer`) para devoluciones. `ReturnCreditNotePDFDocument` muestra número de devolución, fecha, venta de origen, motivo/nota (Tarea 077), detalle de productos devueltos con cantidad y precio unitario, y el total devuelto, bajo el encabezado "Nota de crédito". El endpoint `GET /api/returns/[id]/pdf` resuelve la devolución vía la nueva función puntual `getReturnById` (que cruza `ReturnItem` con `SaleItem` para obtener `unitPrice`, sin tocar `processReturn`), obtiene `businessName` de `StoreSettings` y devuelve el PDF como `application/pdf`. Se agregó el botón "Nota de crédito" (ícono `FileText`) en cada fila del historial de devoluciones, que abre el endpoint en una pestaña nueva.
**Notas:** `npm run build`, lint y typecheck OK. `npm test`: 202 passed / 1 failed / 2 skipped. El único test que falla (`src/app/api/sales/route.integration.test.ts > creates a credit sale with debt through the API flow`) es preexistente y **no está relacionado con esta tarea** — no se tocó ningún archivo de ventas/deudas. Verificado en aislamiento (falla igual corriendo solo ese archivo) y confirmado por diff de git (solo se modificaron archivos de devoluciones). Causa raíz identificada: `createSale` en `src/modules/sales/sale-data-access.ts` fuerza `customerId: null` al crear la venta y **nunca crea un registro `Debt`** para ventas con `paymentType: CREDIT` — la generación automática de deudas desde ventas a crédito, mencionada como ya funcionando en `TAREAS_081_100.md` (Tarea 086), no existe en el código actual. Esto queda fuera del alcance de la Tarea 081 y no se modificó; se recomienda que Diego lo priorice como bug de lógica de negocio, ya que puede estar afectando la generación real de deudas en producción.

---

Historial de Tareas 061–080 revisado, marcado como completado en Notion y archivado por el Ingeniero Líder — 2026-07-12.
