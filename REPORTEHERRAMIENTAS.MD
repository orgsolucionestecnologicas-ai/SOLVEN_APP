# REPORTE BATCH 3 — 2026-06-12

## HERR-08: Rentabilidad por producto
Completado. Archivos modificados:
- src/modules/sales/sale-data-access.ts (`SaleListRecord.items.product` incluye `costPrice`, include de `listSales` actualizado)
- src/app/ui/reports.tsx (`SaleRecord.items.product` ahora `{ name, costPrice } | null`; tabla "Rentabilidad por producto" en RentabilidadTab; ajustes de null-check en CategoryDonutPanel, TopProductsPanel, ProductosTab y otros paneles que leían `item.product.name`)

## HERR-10: Historial de movimientos de inventario por producto
Completado. Archivos creados/modificados:
- src/modules/inventory/inventory-movement-data-access.ts (nueva función `listInventoryMovementsByProduct`)
- src/modules/inventory/index.ts (export agregado)
- src/app/api/products/[id]/movements/route.ts (nuevo)
- src/app/ui/product-detail.tsx (nuevo, `ProductMovementsTimeline`)
- src/app/products/[id]/product-edit-view.tsx (renderiza timeline debajo del formulario)

## HERR-11: Exportación CSV de ventas y productos
Completado. Archivos creados/modificados:
- src/app/api/reports/export/route.ts (nuevo)
- src/app/ui/reports.tsx (helper `downloadReportCsv`, botón "Exportar CSV" en VentasTab y ProductosTab)

## VALIDACIONES FINALES
- lint: OK
- typecheck: OK
- prisma validate: OK
- prisma migrate status: Database schema is up to date
- tests: 188 passed, 0 failed

## GIT
Commit y push a origin/main.
