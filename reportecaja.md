# Reporte — Modal de cobro con filas (monto + dropdown)

Fecha: 2026-06-28
Orden ejecutada: cambioscaja.md ("Modal de cobro — filas con dropdown")

## Resumen
Se rediseñó el modal de cobro: en vez de la grilla de métodos con cards/pills
de color, cada método de pago es ahora una fila `[monto] + [dropdown] + [✕]`.
El cajero agrega filas con el botón "Agregar método de pago". Al abrir el
modal desde "Cobrar" se precarga una fila de Efectivo con el monto total,
editable o reemplazable por cualquier combinación de métodos.

## Cambios
- `src/app/ui/pos.tsx`:
  - `PAYMENT_METHOD_CONFIG` simplificado: sin campo `Icon`, solo
    `{ method, label }`. Se eliminó `PAYMENT_METHOD_STYLE` (pills de color),
    ya sin uso en el nuevo diseño.
  - Imports de lucide-react: se agregó `ChevronDown`; se quitaron
    `CreditCard`, `Globe`, `Landmark`, `Wallet` (solo se usaban para los
    íconos por método del diseño anterior).
  - Botón "Cobrar": ahora precarga `paymentSplits` con una fila Efectivo por
    el monto total (`cartNet`) antes de abrir el modal.
  - Modal de cobro reescrito por completo: filas con input de monto +
    `<select>` de método + botón quitar; N° de operación para
    Tarjeta/Transferencia; recibido/cambio para Efectivo; indicador de
    balance (completo/pendiente/excedido); selector de cliente (obligatorio
    con Fiado, opcional en el resto — preservado del diseño anterior);
    footer con Cancelar/Confirmar cobro.
  - Resto del estado, helpers (`cartNet`, `hasFiado`, `onlyFiado`, etc.) y
    `submitSale()` ya estaban correctos desde la orden anterior — sin
    cambios.

## Observaciones
- El selector de cliente opcional para ventas sin Fiado se mantuvo dentro
  del nuevo modal (decisión del usuario en la orden previa); la orden actual
  no lo mencionaba pero tampoco pedía quitarlo.
- "Pagos a cuenta" quedó fuera de esta orden, como se indicó explícitamente.
- No existen tests unitarios de `pos.tsx` (componente de UI); la cobertura
  se valida con `tsc --noEmit`, `lint` y la suite de integración existente,
  que no se ve afectada porque el contrato de `/api/sales` no cambió.

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 198 tests pasados, 2 skipped (200 total)
