# REPORTE — Sesión 2026-06-07 (Orden 2) — T28 + T24

## Estado: COMPLETADO

## Archivos creados:
- `src/app/pricing/page.tsx` — página pública /pricing con plan AR$15.999/mes y 14 días gratis
- `src/app/ui/pagination.tsx` — componente reutilizable `<Pagination>` con chevrons y contador de páginas

## Archivos modificados (backend):
- `src/app/api/_shared/responses.ts` — agregado `paginatedResponse<T>` con shape `{ data, pagination: { page, limit, total, totalPages, hasNext, hasPrev } }`
- `src/modules/sales/sale-data-access.ts` — `listSales` → `{ data, total }` con `take`/`skip`
- `src/modules/products/product-data-access.ts` — `listProducts` → `{ data, total }`
- `src/modules/customers/customer-data-access.ts` — `listCustomers` → `{ data, total }`
- `src/modules/cash/cash-movement-data-access.ts` — `listCashMovements` → `{ data, total }`
- `src/modules/debts/debt-data-access.ts` — `listDebts` → `{ data, total }`
- `src/modules/expenses/expense-data-access.ts` — `listExpenses` → `{ data, total }`
- 6 API routes (sales, products, customers, cash-movements, debts, expenses) — GET lee `?page&limit`, usa `paginatedResponse`; mensajes de error traducidos al español

## Archivos modificados (frontend):
- `src/app/ui/sales-list.tsx` — fetch `?page=${page}&limit=20`, `<Pagination>` al final; fetches de dropdown con `limit=1000`
- `src/app/ui/customers-list.tsx` — fetches secundarios (sales, debts) con `limit=1000` para preservar métricas del sidebar
- `src/app/ui/cash-movements-list.tsx` — fetch con `limit=1000` (usa paginación interna ya existente)
- `src/app/ui/debts-list.tsx` — fetch debts con `limit=1000`
- `src/app/ui/expenses-list.tsx` — fetch con `limit=1000`
- `src/app/ui/products-inventory.tsx` — fetch con `limit=1000`

## Tests actualizados:
- 6 unit tests de route (`route.test.ts`) — mock del `listXxx` ahora retorna `{ data, total }`, assertions actualizadas
- 6 integration tests de route (`route.integration.test.ts`) — `GET()` ahora recibe `new Request("http://...")`
- `debt-data-access.integration.test.ts` — `expect(result.data)` en lugar de `expect(debts)`
- `sale-data-access.integration.test.ts` — `expect(result.data)` en lugar de `expect(sales)`

## Decisiones tomadas:
- Los componentes UI complejos (customers, cash-movements, debts, expenses, products) usan `limit=1000` en sus fetches ya que tienen paginación interna cliente y necesitan todos los datos para calcular métricas del sidebar. Sales-list usa `page` + `limit=20` con `<Pagination>` visible.
- La firma `GET(request: Request)` se mantiene requerida (Next.js no permite `request?`); los tests de unit e integration pasan `new Request(url)`.

## Validación:
- `npx tsc --noEmit`: PASS
- `npm test`: 177 passing / 2 failed (pre-existing: red intermitente a Neon en cleanup de `sale-data-access.integration.test` — misma falla de sesiones anteriores, no relacionada a estos cambios)

## Commit: cca22b9 feat: pricing page, server-side pagination in all list endpoints

## Próximo: verificar en producción que /pricing carga y que los endpoints paginados responden correctamente con `?page=1&limit=20`.
