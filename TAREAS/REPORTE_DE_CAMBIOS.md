# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## FIX-14 — Descuento en caja/reportes + Ajustes restringido por defecto (2026-08-30)

### Bug 1 — Monto neto en caja y reportes
- `src/modules/sales/sale-data-access.ts`: el `CashMovement` de una venta ahora se registra con el monto neto (`totalAmount.minus(discountAmount)`, `Prisma.Decimal`), no el bruto. `Sale.totalAmount` se mantiene bruto (suma de `item.total`) y `discountAmount` sigue guardándose aparte como registro contable de la promoción; el neto se deriva de ambos donde se necesita "dinero que entró a caja".
- `src/app/ui/cash-register-close.tsx`: se agregó `discountAmount` al tipo `SaleRecord` y un helper `saleNet`; los totales de ventas del cierre (total, contado, crédito) se calculan netos. El efectivo esperado ya deriva de `CashMovement` IN, así que queda neto por el cambio anterior.
- `src/app/ui/reports.tsx`: se agregó `discountAmount` al tipo `SaleRecord` y un helper `saleNet`; toda suma de ventas (KPIs, evolución diaria, por método de pago, por vendedor, por categoría, por cliente, crecimiento, ticket promedio) y el total por venta en la tabla de Ventas usan el neto.
- `src/modules/sales/sale-data-access.integration.test.ts`: test nuevo — una venta con `discountAmount` guarda `totalAmount` bruto, `discountAmount` aparte y el `CashMovement` con el neto.

### Bug 2 — Ajustes oculto por defecto para roles no-Owner
- `src/app/ui/role-permissions-table.tsx`: `DEFAULT_HIDDEN` ahora oculta `settings` por defecto también para `CASHIER`, `INVENTORY` y `READONLY` (antes solo `SUPERVISOR`). No se tocó el fail-open de `requireRole` en `tenant.ts`. Las rutas `/api/settings/*` siguen exigiendo `["OWNER"]` a nivel de código, independiente de esta tabla.

### Validación
- `npm run typecheck` / `npm run lint` sin errores. `npm test`: 324 passed / 2 skipped.

---
