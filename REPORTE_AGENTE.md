# Reporte — T7: Filtros de fecha server-side (Gastos, Ventas, Caja, Deudas)

## Commit
5dbf898 — feat(T7): server-side date filters for sales, expenses, cash and debts

## Resumen
Se activaron filtros de fecha reales (server-side) en los 4 módulos solicitados, reemplazando el filtrado en memoria por cláusulas WHERE de Prisma con parámetros `from`/`to`.

## Cambios por módulo

### Helper
- `src/lib/date-filter.ts` (nuevo): `getDateRangeParams(period)` — convierte "todo"/"hoy"/"semana"/"mes" en rango `{ from, to }` ISO.

### Gastos
- `expense-data-access.ts`: `PaginationParams` con `from?`/`to?`; WHERE sobre `expenseDate`.
- `api/expenses/route.ts`: parsea `from`/`to` de query string (`T00:00:00` / `T23:59:59.999`).
- `expenses-list.tsx`: tabla usa fetch paginado y filtrado por fecha vía `getDateRangeParams`; se eliminó `matchesDateFilter()`.

### Ventas
- `sale-data-access.ts` / `api/sales/route.ts`: mismo patrón sobre `saleDate`.
- `sales-list.tsx`: envía `from=dateFilter&to=dateFilter` (o ninguno con "Todo"); se eliminó el `.filter()` de cliente.

### Caja
- `cash-movement-data-access.ts` / `api/cash-movements/route.ts`: mismo patrón sobre `movementDate`.
- `cash-movements-list.tsx`: envía `from=dateFilterDate&to=dateFilterDate`, agregado toggle "Ver todo"; se eliminó el filtro de fecha en cliente y los helpers `isSameLocalDay`/`isOnDate` (quedaron sin uso).

### Deudas
- `debt-data-access.ts` / `api/debts/route.ts`: mismo patrón sobre `createdAt`.
- `debts-list.tsx`: se agregó selector de período (Todo/Hoy/Esta semana/Este mes) que filtra la tabla server-side vía `getDateRangeParams`.

## Decisión de diseño
Para preservar el comportamiento de las tarjetas de métricas (que deben reflejar el estado global/del día, no el subconjunto filtrado de la tabla), se mantuvieron fetches `?limit=1000` separados e independientes del filtro de fecha de la tabla en Gastos (`allExpenses`), Caja (`todayMovements`) y Deudas (`debts` para métricas vs `tableDebts` para la tabla). Esto evita romper funcionalidad existente conforme a la regla "nunca tocar código que funciona sin necesidad".

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 180 tests / 37 archivos — todos pasan
- `npm run build`: compilación exitosa, todas las rutas generadas correctamente
