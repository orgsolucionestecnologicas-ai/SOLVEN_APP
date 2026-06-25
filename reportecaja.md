# Reporte — Sistema multi-método de pago en POS (splits combinables)

Fecha: 2026-06-25
Orden ejecutada: cambioscaja.md

## Resumen
Se reemplazó el selector único de método de pago en el POS por un sistema de
splits combinables: el cajero puede agregar cualquier combinación de métodos
(Efectivo, Tarjeta, Transferencia, VentaWeb, Otro, Fiado), cada uno con su
propio monto, y la suma de los splits debe igualar el total de la venta antes
de poder confirmar.

## Cambios
- `prisma/schema.prisma` — campo `paymentDetails Json?` agregado a `Sale`
  (migración `20260625174336_add_sale_payment_details`).
- `src/modules/sales/sale-validation.ts` — `CreateSaleInput` y los tres tipos
  `Validated*SaleInput` extendidos con `paymentDetails?`.
- `src/modules/sales/sale-data-access.ts` — `paymentDetails` persistido en
  `transaction.sale.create`.
- `src/app/ui/pos.tsx` — nuevo modelo de estado `paymentSplits`, helpers
  derivados (`hasFiado`, `onlyFiado`, `hasCash`, `isFiado`, `isMixto`,
  `totalAssigned`, `remaining`), render de splits combinables con indicador de
  balance, validación en `handleSubmit` y payload `paymentDetails` enviado a
  la API. Tipos y constante `CASH_PAYMENT_CARDS` legacy eliminados.

## Observaciones
- El cálculo de cambio para Efectivo se movió dentro del render de cada
  split; la constante `cashReceivedNum` quedó sin uso y se eliminó.
- No fue necesario tocar `src/app/api/sales/route.ts`: el handler reenvía el
  body completo a `createSale()` sin allow-listing de campos, por lo que
  `paymentDetails` fluye automáticamente.
- No existen tests unitarios de `pos.tsx` (componente de UI); la cobertura de
  esta entrega se valida con `tsc --noEmit`, `lint` y la suite de integración
  existente sobre `sale-data-access`/`/api/sales`, que sigue pasando sin
  cambios porque `paymentDetails` es opcional y no rompe los payloads previos.

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 198 tests pasados, 2 skipped (200 total)
