# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### Tarea 062 — Notificación de promoción por vencer
Nueva función `getExpiringPromotions(tenantId, hoursAhead = 48)` en `promotion-data-access.ts` (mismo criterio que `getExpiringQuotes`). Nuevo endpoint `GET /api/promotions/expiring`. En `src/app/ui/promotions.tsx` se agregó un badge ámbar junto al título "Promociones" con la cantidad de promociones que vencen en las próximas 48 horas; al hacer clic filtra la lista para mostrar solo esas promociones. Build, lint y typecheck OK.

### Tarea 061 — Importación masiva de catálogo desde CSV
Nuevo endpoint `POST /api/products/import` (`src/app/api/products/import/route.ts`) que recibe filas ya parseadas en el cliente, reutilizando `validateCreateProductInput`/`validateUpdateProductInput`. Matching por `productCode`: si coincide con un producto existente del tenant lo actualiza, si no crea uno nuevo. Todo dentro de `prisma.$transaction`, acumulando errores por fila sin abortar el resto. Nota: el `stock` de filas que actualizan un producto existente no se modifica (consistente con `UpdateProductInput`, que no incluye `stock` — los cambios de stock siguen el flujo de ajustes de inventario). En `src/app/ui/products-inventory.tsx` se agregaron botones "Importar CSV" y "Descargar plantilla CSV", parseo manual de CSV en cliente (sin librerías nuevas) y el modal `ImportProductsModal` con vista previa y resumen de resultados. Build, lint y typecheck OK. Tests: 197 passed / 1 failed (falla preexistente conocida en `sales/route.integration.test.ts`, no relacionada).

Historial de Tareas 041–060 revisado, marcado como completado en Notion y archivado por el Ingeniero Líder — 2026-07-09.
