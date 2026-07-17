# UI-02 — Historial de devoluciones: buscador, filtro de motivo, resumen y badge

> Pedido de Diego tras revisar la pestaña Devoluciones (ya movida a Ventas en UI-01): agregar buscador por folio/cliente, filtro por motivo, un resumen corto arriba de la lista, y mostrar el motivo en cada fila — sin recargar la pantalla ni romper el estilo simple que ya tiene. Correr esta orden después de `FIX_07_metodo_reintegro_devoluciones.md` si ambas están pendientes (esa toca los mismos archivos primero con cambios más estructurales).

## Contexto exacto (ya verificado en el código)

- **Historial**: función `ReturnHistoryPanel()` en `src/app/ui/returns.tsx` (línea 748-…). Estado actual: `fromDate`, `toDate`, `sellerId`, `page`, `records`, `pagination`, `sellers` (línea 749-757). `fetchHistory` (línea 768-789) arma los params (`page`, `limit`, `from`, `to`, `sellerId`) y llama `GET /api/returns?...`.
- **Filtros hoy**: Desde/Hasta (fecha) y Vendedor, renderizados en línea 806-849, más un botón "Exportar CSV". No hay buscador de texto libre ni filtro por motivo.
- **Backend**: `listReturns()` en `src/modules/returns/index.ts` (línea 50-105) solo filtra por `tenantId`, `sellerId` y rango de `createdAt` — no admite `reasonCategory` ni búsqueda por texto. El endpoint `GET /api/returns` (`src/app/api/returns/route.ts`, línea 22-55) solo lee los params `page`, `limit`, `from`, `to`, `sellerId`.
- **Motivos disponibles**: `RETURN_REASON_OPTIONS` ya está definido en `returns.tsx` (línea 94) con `{ value, label }` — reusar esa misma lista para el filtro y para el badge, no inventar etiquetas nuevas. Los valores posibles son los de `RETURN_REASON_CATEGORIES` (`DEFECTO`, `ERROR_VENTA`, `CAMBIO_OPINION`, `OTRO`, definidos en `src/modules/returns/index.ts:11-16`).
- **Folio real vs id fabricado**: cada fila del historial (línea 866-903) hoy muestra `Venta #{record.sale.id.slice(-8).toUpperCase()}` — un fragmento del CUID interno, no el número de venta real que usa el resto del sistema (`Sale.folio`, campo `Int` en el schema, ya usado como folio real en `sales-list.tsx`). `ReturnListRecord.sale` (tipo en `modules/returns/index.ts:39-48`) hoy solo trae `{ id, saleDate, customerName }` — no trae `folio`. Para que el buscador funcione por folio real (no por fragmento de id), hay que sumar `folio` a la selección de `sale` en `listReturns()` y al tipo `ReturnListRecord`/`ReturnDetailRecord`, y mostrar `Venta #{record.sale.folio}` en vez del fragmento de CUID (consistente con cómo se identifica una venta en el resto de SOLVEN).
- **Motivo no se muestra en la fila**: `record.reasonCategory` ya viaja en el tipo `ReturnHistoryRecord` del frontend (línea 56) pero no se usa en el render de la fila (línea 866-903) — solo se usa en el panel de "Nueva devolución"/confirmación.

## Qué hacer

### 1. Backend — `src/modules/returns/index.ts`
- `listReturns()`: agregar parámetros de filtro `reasonCategory?: ReturnReasonCategory` y `search?: string` a la firma. `reasonCategory` filtra directo por el campo homónimo de `Return`. `search` debe matchear por `sale.folio` (si el texto es numérico) y/o `sale.customer.name` (contains, case-insensitive) — usar `OR` en el `where` de Prisma.
- Sumar `folio: true` a la selección de `sale` (línea ~69) y `folio: number` a `ReturnListRecord["sale"]` / `ReturnDetailRecord["sale"]`, propagando el valor real en el `data.map(...)`.

### 2. API — `src/app/api/returns/route.ts`
- `GET`: leer los nuevos params `reasonCategory` y `search` de `searchParams`, validar que `reasonCategory` (si viene) sea uno de `RETURN_REASON_CATEGORIES` antes de pasarlo a `listReturns`, y pasar ambos al llamado existente.

### 3. Frontend — `src/app/ui/returns.tsx`, dentro de `ReturnHistoryPanel()`
- Agregar estado `search` y `reasonCategory` (filtro), incluirlos en `fetchHistory`'s `params` y en las dependencias del `useCallback`/`useEffect` igual que los filtros existentes (mismo patrón que `fromDate`/`toDate`/`sellerId`, usando `handleFilterChange` para resetear `page` a 1).
- Agregar un input de búsqueda (placeholder tipo "Buscar por folio o cliente") y un `<select>` de motivo (opciones desde `RETURN_REASON_OPTIONS`, con "Todos" como default) junto a los filtros existentes de fecha/vendedor — mismo estilo visual (`rounded-lg border border-slate-200 px-3 py-1.5 text-sm`) para que no desentone.
- **Resumen arriba de la lista**: agregar 2-3 chips pequeños con datos derivados de los `records`/`pagination` ya cargados: cantidad total de devoluciones del período (`pagination.total`) y monto total devuelto (sumar `records[].totalAmount` de la página actual, o si se prefiere un total exacto de todo el período — no solo la página visible — evaluar si hace falta un endpoint de agregación nueva; si no es trivial con los datos que ya trae `listReturns`, usar el total de la página visible y aclarar en el reporte que es de la página actual, no del período completo, para no mostrar un número engañoso).
- **Badge de motivo por fila**: en el render de cada `record` (línea ~866-903), agregar un tag pequeño con el label de `RETURN_REASON_OPTIONS` correspondiente a `record.reasonCategory`, con un color sutil por categoría (ej. ámbar para `DEFECTO`, gris para el resto — a criterio del agente, manteniendo la paleta ya usada en el resto de la app, nada saturado).
- Cambiar `Venta #{record.sale.id.slice(-8).toUpperCase()}` por `Venta #{record.sale.folio}` una vez que el folio real viaje en la respuesta.

## Restricciones estrictas

1. No tocar la exportación CSV (`exportReturnsToCsv`) salvo que haga falta sumarle las columnas nuevas (folio real, motivo) — si se toca, mantener el resto de columnas igual.
2. No agregar un panel de filtros avanzados nuevo — los filtros nuevos van en la misma fila de filtros existente.
3. No convertir la lista en una tabla con columnas fijas — mantener el estilo de fila/card actual (consistente con `SalesList`).
4. El resumen de KPIs debe ser honesto: si el monto total mostrado es solo de la página visible (no del período completo), dejarlo aclarado en el propio texto de la UI (ej. "en esta página") para no mostrar un dato que parezca ser el total real cuando no lo es.

## Archivos afectados (esperados)

- `src/modules/returns/index.ts`
- `src/app/api/returns/route.ts`
- `src/app/ui/returns.tsx`

## Protocolo de reporte

1. `npm run typecheck` y `npm run lint` sin errores → `git add -A && git commit -m "feat: buscador, filtro de motivo, resumen y badge en historial de devoluciones" && git push origin main`.
2. `npm test` sin regresiones nuevas.
3. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md`: qué se cambió en cada archivo, cómo quedó resuelto el tema del monto total del resumen (página vs período completo), resultado de typecheck/lint/tests, hash del commit.
4. Agregar una entrada corta (2-4 líneas) arriba de todo en `TAREAS/REPORTELIDER.md` (formato `### 2026-07-17 — UI-02: [resumen]`) — sin borrar las entradas existentes.
5. Entregable en el chat: breve.
