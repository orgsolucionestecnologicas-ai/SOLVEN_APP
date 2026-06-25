# Reporte — Modal de cobro con splits combinables

Fecha: 2026-06-25
Orden ejecutada: cambioscaja.md ("Modal de cobro + sistema de splits")

## Resumen
El selector de métodos de pago se movió de la barra lateral a un modal
centrado, abierto desde el botón "Cobrar". Ahora se puede repetir el mismo
método más de una vez (ej. dos tarjetas) y no hay método por defecto: el
cajero arma el desglose desde cero dentro del modal.

## Cambios
- `prisma/schema.prisma`, `sale-validation.ts`, `sale-data-access.ts` — ya
  satisfechos por la orden anterior (`paymentDetails Json?`); sin cambios.
- `src/app/ui/pos.tsx`:
  - `PaymentSplit` ahora incluye `id` (vía `localId()`) para soportar
    métodos repetidos con key estable en React.
  - Nuevo estado `showPaymentModal`; `paymentSplits` inicia vacío (sin
    método por defecto), salvo precarga de Fiado vía `?customerId=`.
  - `handleSubmit` se separó en `submitSale()` (lógica) + wrapper de evento;
    se agregó validación "Seleccioná al menos un método de pago."
  - Barra lateral: se eliminó el bloque de métodos de pago, el selector de
    cliente y el error de submit — el formulario solo muestra Totales y la
    fila del botón Cobrar.
  - Botón "Cobrar" pasó a `type="button"` y abre el modal en vez de
    enviar el formulario directamente.
  - Modal nuevo: grilla de métodos (siempre agrega un split nuevo, sin
    deduplicar), lista de splits con monto/referencia/cambio de efectivo,
    selector de cliente (obligatorio con Fiado, opcional en el resto),
    error de submit y footer con Cancelar/Confirmar cobro.
  - Variable `isFiado` quedó sin uso tras el cambio del botón y se eliminó.

## Observaciones
- El selector de cliente opcional (ventas sin Fiado) se conservó dentro del
  modal por decisión explícita del usuario, en vez de eliminarse como
  sugería la orden — ver aclaración pedida durante la ejecución. El
  quick-action "Buscar cliente" ahora también abre el modal para que ese
  selector sea alcanzable.
- No existen tests unitarios de `pos.tsx` (componente de UI); la cobertura
  se valida con `tsc --noEmit`, `lint` y la suite de integración existente,
  que no se ve afectada porque el contrato de `/api/sales` no cambió.

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 198 tests pasados, 2 skipped (200 total)
