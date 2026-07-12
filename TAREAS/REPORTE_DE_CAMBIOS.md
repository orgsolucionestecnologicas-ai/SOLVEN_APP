# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 081 — Nota de crédito de la devolución en PDF descargable — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/return-credit-note-pdf.tsx` (nuevo), `src/app/api/returns/[id]/pdf/route.tsx` (nuevo), `src/modules/returns/index.ts` (agregada función `getReturnById`), `src/app/ui/returns.tsx`
**Cambios realizados:** Se replicó el patrón de PDF de cotizaciones (`@react-pdf/renderer`) para devoluciones. `ReturnCreditNotePDFDocument` muestra número de devolución, fecha, venta de origen, motivo/nota (Tarea 077), detalle de productos devueltos con cantidad y precio unitario, y el total devuelto, bajo el encabezado "Nota de crédito". El endpoint `GET /api/returns/[id]/pdf` resuelve la devolución vía la nueva función puntual `getReturnById` (que cruza `ReturnItem` con `SaleItem` para obtener `unitPrice`, sin tocar `processReturn`), obtiene `businessName` de `StoreSettings` y devuelve el PDF como `application/pdf`. Se agregó el botón "Nota de crédito" (ícono `FileText`) en cada fila del historial de devoluciones, que abre el endpoint en una pestaña nueva.
**Notas:** `npm run build`, lint y typecheck OK. `npm test`: 202 passed / 1 failed / 2 skipped. El único test que falla (`src/app/api/sales/route.integration.test.ts > creates a credit sale with debt through the API flow`) es preexistente y **no está relacionado con esta tarea** — no se tocó ningún archivo de ventas/deudas. Verificado en aislamiento (falla igual corriendo solo ese archivo) y confirmado por diff de git (solo se modificaron archivos de devoluciones). Causa raíz identificada: `createSale` en `src/modules/sales/sale-data-access.ts` fuerza `customerId: null` al crear la venta y **nunca crea un registro `Debt`** para ventas con `paymentType: CREDIT` — la generación automática de deudas desde ventas a crédito, mencionada como ya funcionando en `TAREAS_081_100.md` (Tarea 086), no existe en el código actual. Esto queda fuera del alcance de la Tarea 081 y no se modificó; se recomienda que Diego lo priorice como bug de lógica de negocio, ya que puede estar afectando la generación real de deudas en producción.

---

Historial de Tareas 061–080 revisado, marcado como completado en Notion y archivado por el Ingeniero Líder — 2026-07-12.
