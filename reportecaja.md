# Reporte — Modal de cobro: implementación completa + ajustes de UX

Fecha: 2026-06-28
Módulo principal: `src/app/ui/pos.tsx`

---

## ORDEN 1 — Modal de cobro con filas (implementación base)

Orden ejecutada: cambioscaja.md v1 ("Modal de cobro — filas con dropdown")

### Resumen
Se reemplazó el sistema de pago inline de la barra lateral por un modal
centrado que se abre al pulsar "Cobrar". Se eliminó el tipo `PaymentMethod`
y sus constantes asociadas, y se introdujo el tipo `PaymentSplit[]` para
soportar múltiples métodos en una misma venta, incluyendo el mismo método
más de una vez. Se añadió `paymentDetails Json?` al modelo `Sale` para
persistir el detalle de splits. El botón Cobrar pasó de `type="submit"` a
`type="button"` y delega en `submitSale()`, extraído de `handleSubmit()`.

### Cambios aplicados

**`prisma/schema.prisma`:**
- Campo `paymentDetails Json?` agregado al modelo `Sale`.
- Migración ejecutada: `add-sale-payment-details`.

**`src/modules/sales/sale-validation.ts`:**
- `paymentDetails?` agregado a `CreateSaleInput`, `ValidatedCashSaleInput`,
  `ValidatedCreditSaleInput` y `ValidatedMixedSaleInput`.
- `validateCreateSaleInput()` propaga `paymentDetails` en los tres branches.

**`src/modules/sales/sale-data-access.ts`:**
- `createSale()` persiste `paymentDetails: validatedSale.paymentDetails ?? undefined`.

**`src/app/ui/pos.tsx`:**
- Eliminados: `CashPaymentMethod`, `PaymentMethod`, `CASH_PAYMENT_CARDS`,
  `cardOperationNumber`, `transferOperationNumber`, `mixedCashAmount`.
- Agregados: `PaymentMethodKey`, `PaymentSplit`, `PAYMENT_METHOD_CONFIG`,
  `localId()`, estado `paymentSplits`, `showPaymentModal`.
- `handleSubmit` refactorizado: `submitSale()` contiene la lógica;
  `handleSubmit(e)` llama `e.preventDefault()` + `void submitSale()`.
- Sidebar limpiada: se eliminó todo el bloque de pago inline y el
  `submitError` de la barra lateral; quedan solo totales + botón Cobrar.
- Botón Cobrar: `type="button"`, abre el modal, precarga la primera fila
  con monto = `cartNet` y método = "Efectivo".
- Modal agregado: fila por método `[$ monto] [Método ▾] [✕]`, botón
  "+" agrega nueva fila, balance indicator verde/amarillo/rojo,
  picker de cliente inline (para Fiado), campo de referencia para
  Tarjeta/Transferencia, helper Recibido/Vuelto para Efectivo.
- `useEffect` para cerrar el modal con Escape.

### Observaciones
- La migración de Prisma se ejecutó sin datos en producción — sin riesgo.
- El campo `paymentType` en `Sale` no se tocó (CASH / CREDIT / MIXED).
  El valor se computa desde los splits: `onlyFiado → CREDIT`,
  `hasFiado && hasCash → MIXED`, `else → CASH`.
- `cashAmount` en ventas MIXED se calcula como `cartNet - fiadoAmount`.

### Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 200 tests pasados, 2 skipped

---

## ORDEN 2 — Ajustes de UX del modal (correcciones de diseño)

Orden ejecutada: cambioscaja.md v2 ("dropdown primero + helper de efectivo compacto")

### Resumen
Tres correcciones de diseño sobre el modal implementado en la Orden 1:
1. Orden de elementos en la fila invertido: método primero, monto segundo.
2. Helper "Recibido / Vuelto" limitado estrictamente al método Efectivo
   y rediseñado como una sola línea compacta (`text-xs`, sin bloque propio).
3. Picker de cliente eliminado del modal — el cajero lo selecciona en la
   barra lateral antes de abrir el cobro; el modal queda enfocado solo
   en métodos y montos.

### Cambios aplicados

**`src/app/ui/pos.tsx` (modal únicamente):**

- Fila de pago: orden `[Método ▾] → [$ monto] → [✕]`
  (antes: `[$ monto] → [Método ▾] → [✕]`).
- Helper de Efectivo: renderiza solo cuando `split.method === "Efectivo"`.
  Aparece en una sola línea debajo de la fila:
  `Recibido $ [input xs] Vuelto $X,XX` — sin bloque separado ni card.
- Tarjeta / Transferencia: el campo de N° operación permanece debajo de
  la fila, como input compacto (`text-xs`, `rounded-lg`, `py-1.5`).
- Selector de cliente (Fiado) eliminado del modal por completo.
  Si `hasFiado && !selectedCustomerId`, `submitSale()` devuelve el
  error: "Para ventas con Fiado, seleccioná un cliente en la pantalla
  principal antes de cobrar."
- Botón "Confirmar cobro": condición de disabled simplificada
  (ya no incluye `hasFiado && !selectedCustomerId` porque esa validación
  ocurre en `submitSale()` con mensaje de error claro).

### Observaciones
- Sin cambios en Prisma, sale-validation ni sale-data-access —
  Bloques 1-3 ya estaban satisfechos por la Orden 1.
- La selección de cliente para Fiado quedó 100 % en la barra lateral.
  El flujo es: el cajero busca/selecciona cliente → abre "Cobrar" →
  agrega fila con método Fiado. Si intenta confirmar sin cliente, el
  modal muestra el error con instrucción.
- Un test de integración (`sale-data-access.integration.test.ts`) falló
  por corte transitorio de conexión a Neon en la primera corrida;
  re-ejecutado solo y pasó — no relacionado con estos cambios.

### Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 200 tests pasados, 2 skipped (misma falla transitoria de red,
  confirmada como no reproducible)
