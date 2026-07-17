# FIX-07 — Preguntar cómo se reintegra el dinero al procesar una devolución

> Hallazgo real de Diego, no un bug reportado por QA: hoy toda devolución de una venta no-crédito genera un movimiento de caja en EFECTIVO por el monto devuelto, sin importar cómo se pagó realmente la venta original. En una venta dividida (ej. mitad tarjeta, mitad efectivo), esto es un dato falso — el sistema asienta una salida de caja que puede no reflejar lo que en verdad pasó. Diego decidió: agregar un selector "¿Cómo se reintegra?" al formulario de devolución (Efectivo / Tarjeta / Transferencia / Otro), y que el sistema solo mueva la caja cuando el reintegro elegido sea Efectivo. Ya se investigó todo el flujo relevante — no hace falta re-explorar desde cero.

## Diagnóstico exacto (ya confirmado en el código)

- `Sale.paymentType` (`prisma/schema.prisma:196`) solo puede ser `CASH` para ventas nuevas (la Tarea 138 bloqueó `MIXED`/`CREDIT` vía `POST /api/sales`, reservados para registros históricos) — es decir, **toda venta nueva, incluso una pagada mitad tarjeta/mitad efectivo, queda con `paymentType: "CASH"`**. El desglose real de cómo se pagó vive aparte, en `Sale.paymentDetails` (`Json?`, línea 202 del schema), poblado desde `paymentSplits` en `pos.tsx` (`paymentDetailsPayload`, línea ~1361-1362: array de `{ method, amount }`, con `method` siendo uno de `PAYMENT_METHOD_CONFIG` — `Efectivo`, `Tarjeta`, `Transferencia`, `VentaWeb`, `Otro`, definido en `pos.tsx:61-66`).
- `processReturn()` en `src/modules/returns/index.ts` (línea 177-311) hoy decide el reintegro mirando solo `sale.paymentType` (línea 261-286): si es `"CASH"` (que es prácticamente siempre, por lo de arriba) crea un `CashMovement` tipo `OUT` por el `returnTotal` completo (línea 261-271); si es `"CREDIT"` reduce el `Debt.remainingAmount` en su lugar (línea 273-286) — esa rama de crédito está bien y no se toca. El problema es la rama de `"CASH"`: nunca mira `paymentDetails`, así que trata cualquier venta (aunque haya sido pagada con tarjeta o mixta) como si el reintegro completo saliera en efectivo de la caja.
- El formulario de "Nueva devolución" (`src/app/ui/returns.tsx`, función `Returns()`) no le pregunta nada al vendedor sobre el método de reintegro — solo pide motivo (`reasonCategory`) y nota (`reasonNote`).
- El modelo `Return` (`prisma/schema.prisma:509-520`) no tiene ningún campo para guardar el método de reintegro elegido.

## Qué hacer

### 1. Prisma — `prisma/schema.prisma` + migración
- Agregar `refundMethod String?` al modelo `Return` (nullable: los registros históricos no lo van a tener, y las devoluciones de ventas a crédito tampoco lo necesitan). Usar los mismos valores de texto que ya usa `PaymentMethodKey` en `pos.tsx` (`"Efectivo"`, `"Tarjeta"`, `"Transferencia"`, `"VentaWeb"`, `"Otro"`) — no crear un enum nuevo de Prisma, mantener el mismo criterio de string libre que ya usan `CashMovement.type`/`source`.
- Generar la migración con `npx prisma migrate dev` (nombre descriptivo, ej. `add_return_refund_method`) contra la base de desarrollo. No correr `migrate deploy` contra producción — eso queda para cuando Diego lo pida explícitamente.

### 2. Backend — `src/modules/returns/index.ts`
- `processReturn()`: agregar un parámetro `refundMethod?: string`.
- Reemplazar el `if (sale.paymentType === "CASH") { ... }` (línea 261-271) por: crear el `CashMovement OUT` **solo si** `refundMethod === "Efectivo"`. Si el vendedor eligió cualquier otro método (Tarjeta, Transferencia, Otro, VentaWeb), no se crea ningún `CashMovement` — el dinero no sale físicamente de la caja registradora.
- Si `refundMethod` no viene y la venta no es `CREDIT`, lanzar `ReturnValidationError` (es obligatorio elegir un método salvo en devoluciones de ventas a crédito, donde no aplica).
- Guardar `refundMethod` en el `Return` creado (línea 288-302).
- No tocar la rama de `sale.paymentType === "CREDIT"` (línea 273-286) — ahí no hace falta preguntar método, se sigue descontando de la deuda igual que hoy.
- Sumar `refundMethod` a los tipos `ReturnListRecord`/`ReturnDetailRecord` y a los `select`/mapeos de `listReturns()`/`getReturnById()`, para que el historial y el detalle puedan mostrarlo.

### 3. API — `src/app/api/returns/route.ts`
- `POST`: leer `refundMethod` del body, validar que sea uno de los valores conocidos (`"Efectivo" | "Tarjeta" | "Transferencia" | "VentaWeb" | "Otro"`) cuando la venta no sea a crédito, y pasarlo a `processReturn`. Si falta o es inválido en una venta no-crédito, devolver un error de validación claro (mismo patrón que ya usan otros endpoints con `ReturnValidationError`).

### 4. Frontend — `src/app/ui/returns.tsx`
- Extender el tipo `Sale` (línea 19-26) para incluir `paymentDetails: unknown` (o el tipo que corresponda al JSON — verificar primero si `GET /api/sales` ya devuelve este campo sin cambios de backend, dado que `Sale.paymentDetails` es un campo directo del modelo y probablemente ya viaja en la respuesta sin necesidad de tocar el endpoint; confirmar antes de asumir).
- En `handleSelectSale` (línea 165-199) o en el render del paso de formulario, mostrar un resumen de solo lectura de cómo se pagó la venta original (ej. "Pagado con: Tarjeta $500 + Efectivo $500"), parseando `paymentDetails` con los mismos labels de `PAYMENT_METHOD_CONFIG` de `pos.tsx`. Si `paymentDetails` viene vacío/null (ventas viejas), mostrar el `paymentType` como fallback.
- Agregar un selector "¿Cómo se reintegra este monto?" (mismas 5 opciones de método) en el formulario, visible solo cuando `selectedSale.paymentType !== "CREDIT"` (las devoluciones de venta a crédito no necesitan esto, van directo a reducir la deuda). Guardar en un nuevo estado `refundMethod`.
- Extender `canSubmit` (línea 213) para exigir también `refundMethod` elegido cuando corresponda (venta no-crédito).
- Incluir `refundMethod` en el payload del `POST /api/returns` (línea 238-243).

### 5. PDF — `src/app/ui/return-credit-note-pdf.tsx`
- Mostrar el método de reintegro en la nota de crédito impresa/descargable, cerca de donde ya se muestra `total`/`reasonLabel` (línea ~49-50) — para que quede en el papel qué método se usó, no solo en la base de datos.

## Restricciones estrictas

1. No tocar la rama de devoluciones sobre ventas a crédito (`sale.paymentType === "CREDIT"`) — sigue reduciendo la deuda exactamente igual que hoy, sin pedir método de reintegro.
2. No inventar un enum de Prisma nuevo para el método — usar `String?` nullable, consistente con cómo ya se manejan los métodos de pago en el resto del proyecto.
3. No correr `prisma migrate deploy` contra producción como parte de esta tarea.
4. No modificar `sale-validation.ts` ni la restricción de la Tarea 138 (`paymentType` de ventas nuevas sigue siendo solo `CASH`) — este fix no toca cómo se crean las ventas, solo cómo se procesan las devoluciones.
5. Los registros de `Return` ya existentes en la base (sin `refundMethod`) no se migran ni se completan retroactivamente — quedan con el campo `null`, sin inventar un valor.

## Archivos afectados (esperados)

- `prisma/schema.prisma` + nueva migración en `prisma/migrations/`
- `src/modules/returns/index.ts`
- `src/app/api/returns/route.ts`
- `src/app/ui/returns.tsx`
- `src/app/ui/return-credit-note-pdf.tsx`

## Protocolo de reporte

1. `npm run typecheck` y `npm run lint` sin errores → `git add -A && git commit -m "feat: seleccionar metodo de reintegro al procesar una devolucion" && git push origin main`.
2. `npm test` sin regresiones nuevas — agregar o actualizar tests de `processReturn`/`POST /api/returns` que confirmen: (a) con `refundMethod: "Efectivo"` se crea el `CashMovement`; (b) con `refundMethod: "Tarjeta"` (u otro no-efectivo) NO se crea ningún `CashMovement`; (c) una devolución sobre venta a crédito sigue funcionando sin pedir `refundMethod`.
3. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md`: qué se cambió en cada archivo, nombre de la migración generada, resultado de typecheck/lint/tests, hash del commit.
4. Agregar una entrada corta (2-4 líneas) arriba de todo en `TAREAS/REPORTELIDER.md` (formato `### 2026-07-17 — FIX-07: [resumen]`) — sin borrar las entradas existentes.
5. Entregable en el chat: breve — incluir explícitamente si `GET /api/sales` ya traía `paymentDetails` o si hizo falta tocar ese endpoint también.
