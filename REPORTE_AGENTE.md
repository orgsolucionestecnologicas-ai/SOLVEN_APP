# REPORTE — S3-02/03
## Estado: COMPLETADO
## Archivos modificados:
- prisma/schema.prisma — agregados modelos Return y ReturnItem; campo returns Return[] en Sale
- src/modules/returns/index.ts — prevención de devolución doble, reducción de deuda en ventas a crédito, creación de registro Return, returnId en ReturnResult
- src/app/api/returns/route.test.ts — resultado existente actualizado con returnId; 2 tests nuevos

## Archivos creados:
- prisma/migrations/20260527220258_add_return_model/migration.sql

## Migraciones corridas:
- 20260527220258_add_return_model

## Observaciones:
- Commit: 2f70a21 fix: prevent double returns and reduce debt on credit returns
- 179 tests pasan (2 nuevos), lint y typecheck limpios
- La validación de devolución doble suma cantidades de todos los ReturnItem previos para esa venta
- La reducción de deuda se hace dentro de la misma transacción atómica
- remainingAmount nunca queda negativo (se clampea a 0)
