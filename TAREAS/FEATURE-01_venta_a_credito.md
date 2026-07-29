# FEATURE-01 — Venta a crédito/fiado real (CREDIT y MIXED), lo más completa posible

> Origen: hallazgo Crítico #1 de `TAREAS/QA_REPORTE.md` (QA-CHROME-01). Decisión de Diego (29-07-2026): "dejemos lo más completo que podamos" — implementar CREDIT (fiado completo) y MIXED (parte pagada + parte fiada) en la misma orden, con descuento de stock inmediato igual que una venta de contado. Investigación de código ya hecha por el Ingeniero Líder — las líneas citadas abajo son el mapa real, no una suposición.

## 0 — Qué existe hoy (para no reinventar)

El schema **ya soporta esto** — no hace falta migración para los enums/campos base:
- `SalePaymentType { CASH, CREDIT, MIXED }` (schema.prisma:10-14).
- `Sale.debtId String? @unique` (schema.prisma:198) — **relación Sale↔Debt estrictamente 1:1**. Cada venta fiada/mixta tiene su propia Debt, nunca comparte una Debt con otra venta.
- `Sale.cashAmount Decimal?` (schema.prisma:201) — existe pero hoy siempre se guarda `null`. Es el campo natural para la porción cobrada en el momento en una venta MIXED.
- `Sale.paymentDetails Json?` (schema.prisma:202) — ya se usa para guardar el desglose de métodos de pago.
- El módulo de deudas (`src/modules/debts/`) ya soporta pagos parciales sobre cualquier `Debt` (`debt-payment-data-access.ts`, `registerDebtPayment`) — **no debería necesitar cambios**, una Debt originada por una venta fiada se cobra con el mismo flujo de "Registrar pago/abono" que ya existe y funciona.
- `emitInvoice()` (`src/modules/invoices/invoice-data-access.ts:33-125`) ya es agnóstico al estado de cobro — factura `sale.totalAmount` sin mirar `paymentType`. **No debería necesitar cambios.** Verificar al final que nadie le agregó sin querer una validación de `paymentType === CASH`.

Lo que bloquea todo esto hoy es **solo código de validación/UI**, no el modelo de datos:
- `sale-validation.ts:68-70` rechaza cualquier `paymentType !== "CASH"` con el error "Sale payment type must be CASH."
- `sale-data-access.ts:167` hardcodea `customerId: null` al crear la Sale — **ningún cliente seleccionado en el POS llega nunca a la venta**, ni siquiera hoy con ventas de contado (bug preexistente que hay que arreglar como parte de esto, es un prerequisito).
- `pos.tsx`: el modal "Cobrar" exige que la suma de `paymentSplits` sea exactamente igual al total (líneas 1352-1357, 3368-3372) — no hay forma de dejar un remanente como "fiado".

## 1 — Backend: `sale-validation.ts`

1. Ampliar `CreateSaleInput.paymentType` (línea 11) a `"CASH" | "CREDIT" | "MIXED"`.
2. Reemplazar el bloqueo de la línea 68-70 por validación real:
   - `CASH`: comportamiento actual, sin cambios.
   - `CREDIT`: exigir `customerId` no vacío. El monto cobrado en el momento es $0 (sin `paymentSplits` de métodos reales, o vacíos).
   - `MIXED`: exigir `customerId` no vacío, exigir que la suma de los métodos de pago "reales" (efectivo/tarjeta/transferencia/etc.) más el monto fiado sea igual a `totalAmount` neto (post-descuento — ver Bug 1 de `FIX-14`, este cálculo debe usar el monto ya corregido).
3. Actualizar `ValidatedSaleInput`/`ValidatedCashSaleInput` (líneas 33-42) para incluir las variantes CREDIT/MIXED con sus campos (`customerId` obligatorio, `creditAmount`).

## 2 — Backend: `sale-data-access.ts` (`createSale`, líneas 83-255)

Dentro de la misma transacción donde hoy se crea la Sale y el CashMovement:

1. **Pasar el `customerId` real** en vez del hardcode `null` (línea 167) — para las 3 modalidades de pago, no solo CREDIT/MIXED (arregla el bug preexistente de que ninguna venta queda vinculada a un cliente).
2. Si `paymentType !== "CASH"`:
   - Calcular `creditAmount` = `totalAmount` neto (post-descuento) menos lo efectivamente cobrado ahora (`0` para CREDIT completo, la suma de splits reales para MIXED).
   - Crear una `Debt` con `remainingAmount = creditAmount`, `totalAmount = creditAmount`, `customerId`, `dueDate` (definir un default razonable, ej. 30 días, o `null` si no se pide explícitamente — a criterio de quien implemente, no es crítico).
   - Guardar `sale.debtId` apuntando a esa Debt recién creada (recordar el `@unique` — una Debt por venta, nunca reutilizar una Debt existente del cliente).
   - Guardar `sale.cashAmount` = lo efectivamente cobrado ahora (0 para CREDIT, el monto real para MIXED).
3. **`CashMovement`** (línea 221-229): hoy se crea siempre por `totalAmount` completo. Cambiar a crearlo solo por la porción efectivamente cobrada en el momento (`cashAmount` para MIXED, no crear ninguno — o crear uno de monto 0, lo que sea más consistente con el resto del código — para CREDIT puro).
4. **Stock**: sin cambios — `reduceProductStock` (líneas 421-443) debe seguir descontando stock igual para las 3 modalidades, tal como se decidió.
5. **Límite de crédito**: hoy existe un chequeo de `creditLimit` del cliente, pero solo como `window.confirm` en el frontend de `debts-list.tsx` (líneas 960-970), no en el backend. Para esta orden, agregar la validación real en el backend (rechazar si `creditAmount` haría que la deuda total del cliente supere su `creditLimit`, salvo que el usuario sea OWNER — a definir el criterio exacto de override, documentarlo en el commit). Es una decisión del Ingeniero Líder tomada para que quede "lo más completo posible" tal como pidió Diego — si algo no cierra al implementarlo, avisar en el reporte en vez de saltearlo en silencio.

## 3 — Frontend: `pos.tsx` (modal "Cobrar")

1. Agregar una opción de "Fiado" (o similar) al lado de los métodos de pago existentes (`PAYMENT_METHOD_CONFIG`, líneas 61-67) — puede ser un método más en el split, o una sección aparte "monto a fiar", lo que se sienta más natural en la UI existente.
2. Relajar la validación de `remaining` (líneas 1352-1357, 3368-3372): el "Confirmar cobro" debe habilitarse también cuando `splits reales + monto fiado === total`, no solo cuando `splits reales === total`.
3. Si hay algún monto fiado (`> 0`), **exigir cliente seleccionado** — bloquear "Confirmar cobro" con un mensaje claro si no hay cliente elegido y hay monto fiado.
4. Enviar al backend (`submitSale`, líneas 1369-1408, hoy manda `paymentType: "CASH"` fijo en la línea 1373): `paymentType` real (`CASH`/`CREDIT`/`MIXED`), `customerId` (hoy nunca se manda, arreglar), y el monto fiado.
5. **`sales-list.tsx` tiene un segundo formulario de creación de venta** (`CreateSaleModal`, líneas 918-1090+, también hardcodea `paymentType: "CASH"` en las líneas 924 y 1058). Debe recibir el mismo tratamiento — no dejarlo como excepción, o el bug original reaparece por otra puerta. Si por alcance/tiempo no se llega, documentarlo explícitamente en el reporte como pendiente, no dejarlo sin mencionar.

## 4 — Frontend: reportes y badges

1. `sales-list.tsx` (`getPaymentBadgeInfo`, líneas 1277-1305): hoy el badge "Mixto" se usa tanto para "pago dividido 100% cobrado" (ej. mitad efectivo/mitad tarjeta) como para "parte cobrada + parte fiada". Diferenciarlos visualmente — por ejemplo "Mixto" para el primer caso (ya existente) y "Parcial/Fiado" o similar para cuando `sale.paymentType === "MIXED"` con deuda asociada.
2. `reports.tsx` (líneas 2997-3009): `cashAmount`/`creditAmount` solo bucketizan `CASH`/`CREDIT` — las ventas `MIXED` no caen en ninguno de los dos hoy. Sumar un tercer bucket o prorratear correctamente para que los totales de reportes sigan cuadrando.

## 5 — Qué NO tocar

- `src/lib/arca/*`, `src/modules/invoices/*` — confirmado que `emitInvoice()` ya es agnóstico al estado de cobro, no debería requerir cambios. Si al tocar esto se nota que hace falta algo, avisar antes de tocarlo, no asumir.
- `src/modules/debts/debt-payment-data-access.ts` — el cobro de deudas ya funciona genéricamente, no debería necesitar cambios para que funcione sobre deudas originadas por ventas.
- El bug de descuento en caja/reportes (`FIX-14`) es una orden aparte — si todavía no se ejecutó, tenerlo en cuenta al calcular montos netos acá pero no mezclar los commits de ambas órdenes.

## 6 — Validación y cierre

- `typecheck`/`lint`/`test` sin errores.
- Escribir tests nuevos para: venta CREDIT completa (stock baja, Debt se crea con el monto completo, CashMovement no se crea o se crea en $0, cliente queda vinculado), venta MIXED (Debt se crea solo por la porción fiada, CashMovement se crea solo por la porción cobrada), y el límite de crédito rechazando una venta que lo superaría.
- Reportar en `TAREAS/REPORTE_DE_CAMBIOS.md` (sin frases de autoverificación) — dado el tamaño de esta orden, es válido dividir el reporte en secciones (backend, POS, reportes/badges) para que sea más fácil de verificar.
- Commit + push a GitHub al final. Dado el alcance, es razonable dividir en varios commits (validación+backend, POS, reportes/badges) en vez de uno solo gigante — más fácil de revisar y de revertir si algo sale mal.
