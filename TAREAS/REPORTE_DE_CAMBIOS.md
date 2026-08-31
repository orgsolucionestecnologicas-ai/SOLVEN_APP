# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## FEATURE-01 — Venta a crédito/fiado (CREDIT + MIXED) — 2026-08-31

Ventas a crédito (fiado total) y mixtas (parte cobrada + parte fiada), con baja
de stock inmediata igual que una venta al contado. Se levanta la restricción
previa de "nuevas ventas por API solo CASH".

### Backend — commit cb45e3d
- `sale-validation.ts`: `paymentType` acepta CASH | CREDIT | MIXED. El tipo de
  entrada validada queda discriminado por `paymentType`; CREDIT y MIXED exigen
  `customerId`. La función pura solo valida estructura (cliente presente), no
  montos.
- `sale-data-access.ts` / `createSale`: para CREDIT y MIXED crea una `Debt` por
  venta (relación 1:1 vía `Sale.debtId`), guarda `Sale.cashAmount` con la
  porción cobrada y genera `CashMovement` solo por lo efectivamente cobrado. El
  stock baja igual que en una venta al contado.
- Errores nuevos: `SaleCreditLimitExceededError` (HTTP 409) y
  `SaleCustomerNotFoundError` (HTTP 400).
- `route.ts`: pasa `userRole` a `createSale` y mapea los errores nuevos.

Decisión propia a revisar — criterio del límite de crédito:
- Se rechaza la venta cuando el saldo proyectado del cliente (suma de
  `Debt.remainingAmount` con `writtenOff=false` + el nuevo monto fiado) supera
  `Customer.creditLimit`.
- `creditLimit` nulo = sin límite.
- El rol OWNER siempre puede pasar por encima del límite (override).
- `userRole` llega a `createSale` por un tercer argumento opcional
  (`options.userRole`), retrocompatible con los llamadores existentes.

Desvío respecto al mapa literal de la orden:
- La orden pedía validar `sum(métodos reales) + fiado === total` dentro de
  `sale-validation.ts`. Para respetar la regla "recalcular montos desde la base,
  nunca confiar en el payload", el monto fiado se DERIVA en el servidor
  (`creditAmount = netTotal - cobrado`) dentro de `createSale`. Así la `Debt` y
  el `CashMovement` siempre reconcilian con el neto de la venta, y la función
  pura queda libre de aritmética sobre montos del cliente.

### POS — commit 6d0a092
- `pos.tsx`: cualquier monto sin asignar en el modal Cobrar pasa a ser la
  porción fiada. Remanente total → CREDIT; remanente parcial → MIXED; total
  asignado → CASH. Se relaja la validación de "monto exacto" para permitir un
  remanente positivo como fiado (sigue bloqueando el sobreasignado).
- Requiere cliente seleccionado cuando hay monto a fiar; envía `paymentType` y
  `customerId` reales; panel "A fiar" en el modal.

### Reportes y badges — commit b020da9
- `reports.tsx`: `paymentType` incluye MIXED y se agrega `cashAmount`. Helpers
  nuevos `saleCashPortion`/`saleCreditPortion`. Los totales de contado y crédito
  ahora suman la porción MIXED, de modo que contado + crédito reconcilian con el
  total (resumen del mes, panel de métodos de pago, desglose por período y
  recomendaciones). El badge por fila muestra "Mixto" para MIXED.
- `sales-list.tsx`: el badge distingue MIXED ("Parcial", que arrastra deuda) del
  pago multi-método al contado ("Mixto").

### Fix arrastrado — commit 5f3f756
- `sales-list.tsx` (CreateSaleModal): ahora envía el `customerId` seleccionado
  (antes se seteaba el estado pero nunca se mandaba en el payload).

### Tests
- `sale-validation.test.ts`: CREDIT/MIXED con y sin cliente.
- `sale-data-access.integration.test.ts`: CREDIT completa (stock baja, `Debt`
  por el total, sin `CashMovement`, cliente vinculado, `cashAmount` en 0), MIXED
  (`Debt` solo por la porción fiada, `CashMovement` solo por lo cobrado) y
  rechazo por límite de crédito con override de OWNER.
- `route.test.ts`: tercer argumento `{ userRole }` y clases de error nuevas en
  el mock del módulo.
- `core-business-flow.integration.test.ts`: el caso que rechazaba CREDIT ahora
  cubre el rechazo de CREDIT sin cliente.

### Pendiente documentado
- El modal secundario `CreateSaleModal` de `sales-list.tsx` no tiene UI de pago
  dividido, así que no puede expresar fiado parcial; queda como venta al contado
  con cliente. El fiado completo se opera desde el POS.

### Validación
- `npm run lint`, `npm run typecheck` y `npm test` (331 passed / 2 skipped).

---
