# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 045 — Movimientos negativos resaltados en rojo en el historial — 2026-07-09
**Estado:** ✅ Completada
**Archivos modificados:** src/app/products/components/InventoryTab.tsx
**Cambios realizados:** Se verificó que `quantityChange` ya se mostraba en rojo y el ícono circular ya cambiaba a rojo para salidas, pero faltaba resaltar la fila/tarjeta completa. En `MovementsList`, la `<tr>` ahora agrega `border-l-2 border-rose-400 bg-rose-50/40` cuando `m.quantityChange < 0`, sin romper el `hover:bg-slate-50/50` existente. En `RecentMovements` (sidebar de "Últimos movimientos"), la tarjeta de cada movimiento aplica el mismo criterio (borde izquierdo rojo + fondo suave) en lugar del `border-slate-100 bg-slate-50` por defecto. Se usó directamente `m.quantityChange < 0` en ambos lugares, sin duplicar `getMovementType`.
**Notas:** No se modificó el endpoint de movimientos ni el schema de Prisma. Solo se tocó InventoryTab.tsx. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 199 pasaron, única falla preexistente y ya documentada (`route.integration.test.ts` — "creates a credit sale with debt through the API flow"); dos fallas adicionales vistas en una corrida intermedia (`dashboard/summary/route.integration.test.ts` y una repetición del caso de crédito) resultaron transitorias por carga concurrente de la suite — se confirmó reejecutando el archivo de dashboard aislado (pasó limpio) y la suite completa una vez más (solo la falla conocida); sin relación con este cambio.
---

## Tarea 044 — Confirmación antes de ajuste negativo de stock (prevenir errores) — 2026-07-09
**Estado:** ✅ Completada
**Archivos modificados:** src/app/products/components/InventoryTab.tsx
**Cambios realizados:** En `AdjustStockModal`, cuando el ajuste es negativo (`difference < 0`), al hacer clic en "Guardar ajuste" ya no se envía el `POST` directamente: se agregó el estado `showConfirmStep` que reemplaza el contenido del formulario (dentro del mismo modal, sin abrir uno nuevo) por un paso de confirmación con producto, stock actual, nuevo stock y la cantidad a dar de baja, junto con los botones "Volver" (vuelve al formulario sin enviar nada) y "Confirmar ajuste" (recién ahí ejecuta el `POST` a `/api/inventory-adjustments`). Se separó `handleSubmit` en `handleFormSubmit` (intercepta el submit: si es un ajuste negativo y todavía no se mostró la confirmación, solo la muestra; en cualquier otro caso ejecuta el envío real) y `performSubmit` (la llamada al API, sin cambios en su lógica). Los ajustes positivos o sin cambio mantienen el comportamiento directo de siempre, sin paso adicional.
**Notas:** No se modificó el endpoint `/api/inventory-adjustments`, el schema de Prisma, ni `inventory-adjust-form.tsx`. Solo se tocó InventoryTab.tsx. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 197 pasaron, única falla preexistente y ya documentada (`route.integration.test.ts` — "creates a credit sale with debt through the API flow"); sin fallas nuevas.
---

## Tarea 043 — Motivo estructurado y obligatorio en ajustes negativos de stock — 2026-07-09
**Estado:** ✅ Completada
**Archivos modificados:** src/app/products/components/InventoryTab.tsx
**Cambios realizados:** Se verificó primero `src/app/ui/inventory-adjust-form.tsx`, que ya usaba un selector estructurado de tipo + motivo (`TIPOS_AJUSTE`/`MOTIVOS_BY_TIPO`), mientras que el modal rápido `AdjustStockModal` dentro de `InventoryTab.tsx` solo pedía un campo de texto libre `reason` para cualquier ajuste. Se agregaron las constantes `TIPOS_AJUSTE_NEGATIVO`/`MOTIVOS_BY_TIPO_NEGATIVO` (duplicadas con los mismos valores que `inventory-adjust-form.tsx`, per instrucción explícita de la tarea de que la duplicación es aceptable si extraerlas complica el alcance) y un booleano derivado `isNegativeAdjustment` (`difference < 0`). Cuando el nuevo stock es menor al actual, el modal ahora muestra dos `<select>` obligatorios en cascada (tipo de ajuste → motivo específico, con `handleTipoChange` autoseleccionando el primer motivo del tipo elegido) en lugar del campo de texto libre; el motivo final se compone como `${tipoAjuste} - ${motivo}` (ej. "Pérdida / Deterioro - Vencimiento de producto"). Para ajustes positivos o sin cambio, se mantiene sin modificaciones el campo de texto libre `reason` existente.
**Notas:** No se modificó `/api/inventory-adjustments` ni el schema de Prisma — solo el formulario cliente en InventoryTab.tsx. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 195 pasaron, 3 fallas — la única preexistente y ya documentada (`route.integration.test.ts` — "creates a credit sale with debt through the API flow") más 2 fallas transitorias de conectividad a Neon en `expenses/route.integration.test.ts` (archivo sin relación alguna con este cambio; se confirmó re-ejecutando los tests de ventas de forma aislada, que pasaron limpio tras limpiar un `Sale` huérfano sin `SaleItem` — dato de prueba, no de producción — que había quedado de una corrida anterior interrumpida por caída de conexión a Neon). Sin fallas nuevas relacionadas al cambio.
---

## Tarea 042 — Botón 'Cerrar Caja' con confirmación de dos pasos y resumen final — 2026-07-09
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/cash-register-close.tsx
**Cambios realizados:** El envío del cierre (tanto el botón "Cerrar caja" del header como el botón "Cerrar caja y finalizar" del formulario, ambos disparaban directamente el `PUT` real) ahora pasan por un paso de confirmación intermedio. Se agregó el estado `showConfirmClose` y se separó la función original `handleSubmit` en `requestClose` (previene el submit del form y abre el modal de confirmación) y `performClose` (ejecuta el `PUT` real a `/api/cash-register/[id]`, antes disparado directamente). Se agregó el componente `ConfirmCloseModal` con un resumen final (cajero, monto de apertura, monto esperado, monto contado/`closingAmount`, diferencia con el mismo color condicional que el sidebar) y dos botones: "Cancelar" (cierra el modal sin enviar nada al backend) y "Confirmar cierre" (llama a `performClose`).
**Notas:** No se modificó el cálculo de `expectedAmount`, `closingAmount` ni `difference`, ni el endpoint de cierre de caja — solo el flujo de confirmación en cliente. Solo se tocó cash-register-close.tsx. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 196 pasaron, mismas 2 fallas preexistentes y no relacionadas (route.integration.test.ts y debt-payment-data-access.integration.test.ts, ya documentadas como flaky); sin nuevas fallas.
---

## Tarea 041 — Movimientos por tipo con color: VENTA=verde · GASTO=naranja · RETIRO=rojo · AJUSTE=gris — 2026-07-09
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/cash-movements-list.tsx
**Cambios realizados:** Se agregó `getMovementCategoryStyle(m)`, que deriva una categoría visual a partir de `source` + `type`: `SALE` → "Venta" (emerald-100/emerald-700), `EXPENSE` → "Gasto" (orange-100/orange-700), `MANUAL` con `type: "OUT"` → "Retiro" (rose-100/rose-700), cualquier otro caso (`MANUAL` + `IN`, `DEBT_PAYMENT`, `RETURN`, etc.) → "Ajuste" (slate-100/slate-600). En cada fila del listado se agregó un segundo badge con esta categoría junto al badge existente de "↑ Ingreso"/"↓ Salida" (que no fue reemplazado, solo se le sumó el refuerzo visual de color por categoría).
**Notas:** No se modificó el schema de Prisma ni los valores reales de `source`/`type` que graban los módulos de ventas, gastos, deudas y retornos. Solo se tocó cash-movements-list.tsx. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 197 pasaron, única falla preexistente y no relacionada (`route.integration.test.ts` — "creates a credit sale with debt through the API flow"); sin nuevas fallas.
---

## Tarea 040 — Descarga del resumen de cierre en PDF para archivo o impresión — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/cash-movements-list.tsx
**Cambios realizados:** Se agregó un botón "Descargar PDF" en el footer de `ClosedSessionDetailModal` (resumen de cierre, incluyendo el historial de la Tarea 039), que llama a `window.print()`. Se verificó `package.json` antes de empezar: el proyecto ya usa `@react-pdf/renderer` para PDFs de cotizaciones (`/api/quotes/[id]/pdf`), pero el prompt pedía explícitamente generar el PDF en cliente con `window.print()` + clases `print:` de Tailwind, así que no se agregó ninguna librería nueva ni se reusó `@react-pdf/renderer`. El modal ahora tiene una vista especial de impresión: el backdrop pasa a `print:static print:block print:bg-white print:p-0`, la tarjeta a `print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none`, el header y footer on-screen llevan `print:hidden`, y se agregó un bloque de encabezado solo-impresión (`hidden print:block`) con el nombre del negocio (obtenido de `GET /api/settings`) y "Resumen de cierre de caja". El `<dl>` con cajero, sucursal, apertura, cierre, monto de apertura, monto esperado, monto contado, diferencia y desglose de denominaciones (Tarea 037) ya se mostraba en pantalla y ahora también se imprime tal cual. Como el modal es descendiente de `CashRegisterHistoryView`, cuyo contenido principal se marcó `print:hidden`, se restructuró el `return` de ese componente con un Fragment para que el modal sea hermano (no hijo) del contenido oculto — de lo contrario `display:none` en el ancestro habría ocultado también el modal al imprimir.
**Notas:** No se modificó el schema de Prisma ni ninguna dependencia. Cambio acotado a `cash-movements-list.tsx`. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 197 pasaron, única falla preexistente y no relacionada (`route.integration.test.ts` — "creates a credit sale with debt through the API flow"); sin nuevas fallas.
---

## Tarea 039 — Historial de cierres anteriores — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/api/cash-register/sessions/route.ts, src/modules/cash-register/cash-register-data-access.ts, src/modules/cash-register/index.ts, src/app/ui/cash-movements-list.tsx
**Cambios realizados:** Ya existía un endpoint `GET /api/cash-register/sessions` (no consumido por ninguna UI todavía), pero listaba todas las sesiones sin filtrar ni paginar. Se agregó `listClosedSessions(tenantId, { page, limit })` en el módulo cash-register (filtra `status: "CLOSED"`, ordena por `closedAt desc`, pagina con `prisma.$transaction([findMany, count])`, mismo patrón que `listAuditLogs`), y se actualizó el route handler para usarla junto con `paginatedResponse` y soporte de `?page=`/`?limit=`. En `cash-movements-list.tsx` se agregó el botón "Historial de cierres" en el header (junto a "Cierre de caja") que abre una nueva vista `CashRegisterHistoryView`: tabla de sesiones cerradas con fecha de apertura/cierre, cajero, monto de apertura, monto de cierre y diferencia, con paginación simple. Al hacer clic en una fila se abre `ClosedSessionDetailModal` con el detalle completo (cajero, sucursal, apertura, cierre, monto de apertura, monto esperado, monto contado, diferencia, notas y el desglose de denominaciones de `closingBreakdown` si existe, de la Tarea 037).
**Notas:** Vista de solo lectura, no permite editar sesiones pasadas. No se modificó el schema de Prisma. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 196 pasaron, mismas 2 fallas preexistentes y no relacionadas (route.integration.test.ts y debt-payment-data-access.integration.test.ts, ya documentadas); sin nuevas fallas.
---

## Tarea 038 — Exportar movimientos de caja a CSV por período seleccionado — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/cash-movements-list.tsx
**Cambios realizados:** Se agregó un botón "Exportar CSV" junto a los filtros de período existentes (tipo, fecha, "Ver todo"). Genera el CSV en el cliente a partir de `filteredMovements` (los movimientos actualmente visibles/filtrados por tipo, fecha y búsqueda), con columnas Fecha, Tipo, Monto, Origen, Referencia — mismo patrón ya usado en `exportSalesToCsv` de sales-list.tsx (`escapeCsvValue` con regex `/[",\n]/`, filas unidas con `\r\n`, `Blob` + `URL.createObjectURL` + click programático en `<a>` + `URL.revokeObjectURL`). El archivo se descarga como `caja_YYYY-MM-DD.csv` con la fecha actual.
**Notas:** No se agregaron librerías externas ni se modificó el API de movimientos de caja. El botón "Exportar" preexistente en el header (placeholder con alert) no fue tocado — el prompt pedía específicamente un botón junto a los filtros de período, no reemplazar ese placeholder. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 196 pasaron, mismas 2 fallas preexistentes y no relacionadas (route.integration.test.ts y debt-payment-data-access.integration.test.ts, ya documentadas); sin nuevas fallas.
---

## Tarea 037 — Conteo de denominaciones al cierre — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/cash-register-close.tsx
**Cambios realizados:** El desglose de denominaciones (billetes y monedas), el cálculo automático del total contado y el guardado en `closingBreakdown` ya estaban implementados (pasos 1, 2, 4 y 5 del prompt). Faltaba el punto 3: permitir editar manualmente el total en lugar de depender exclusivamente de la suma del desglose. Se agregó el estado `manualTotal` y la constante derivada `closingAmount` (= override manual si existe, si no la suma del desglose `breakdownTotal`). La celda de "Total efectivo contado" en la tabla de denominaciones ahora es un input editable (prefilled con la suma del desglose, mostrada como referencia debajo del label); editar cualquier denominación limpia el override y vuelve al cálculo automático. `closingAmount` reemplaza a `breakdownTotal` en el payload enviado a `PUT /api/cash-register/[id]`, en el cálculo de `difference` y en el resumen del sidebar ("Efectivo contado").
**Notas:** No se modificó el schema de Prisma ni la lógica de cálculo de `expectedAmount`. Solo se tocó cash-register-close.tsx (cash-movement-form.tsx y cash-movements-list.tsx mencionados en "Archivos afectados" no corresponden a este flujo — el cierre de caja vive en cash-register-close.tsx). `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 197 pasaron, única falla preexistente y no relacionada (route.integration.test.ts — "creates a credit sale with debt through the API flow"); sin nuevas fallas.
---

## Tarea 036 — Clic en nombre del cliente navega directo al perfil — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/sales-list.tsx
**Cambios realizados:** El nombre del cliente en `SaleCard` (listado) y en `SaleDetailModal` (detalle) ahora es un `<Link href={`/customers/${sale.customerId}`}>` de Next.js cuando `sale.customerId` no es null, con estilo `hover:text-violet-600 hover:underline`. Cuando `customerId` es null (venta sin cliente asociado) se sigue mostrando el nombre como texto plano, sin link.
**Notas:** No se modificó la página /customers/[id] ni el API de ventas. Solo se tocó sales-list.tsx. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 196 pasaron, mismas 2 fallas preexistentes y no relacionadas (route.integration.test.ts y debt-payment-data-access.integration.test.ts, ya documentadas); sin nuevas fallas.
---

## Tarea 035 — Folio de venta copiable con un clic — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/sales-list.tsx
**Cambios realizados:** Se agregó el componente `CopyFolioButton`, que copia el folio formateado (`formatFolio()`) al portapapeles con `navigator.clipboard.writeText()` y muestra una confirmación visual (ícono `Check` de lucide-react durante 1.5s, luego vuelve a `Copy`). Se colocó junto al folio en `SaleCard` (listado) y en el encabezado de `SaleDetailModal` (modal de detalle).
**Notas:** No se modificó el API de ventas ni se usaron librerías externas de clipboard. Solo se tocó sales-list.tsx. `npm run build`, lint y typecheck ejecutados sin errores. `npm test`: 196 pasaron, 2 fallas preexistentes y no relacionadas (`route.integration.test.ts` — "creates a credit sale with debt through the API flow" — y `debt-payment-data-access.integration.test.ts` — concurrencia, ya documentada como flaky por agotamiento del pool de conexiones de Neon bajo carga concurrente); sin nuevas fallas.
---

## Tarea 034 — Badge de método de pago con color propio por tipo — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/sales-list.tsx
**Cambios realizados:** `PaymentTypeBadge` solo distinguía CASH ("Contado", verde)/CREDIT ("Crédito", azul) e ignoraba `MIXED` y el instrumento específico en `paymentDetails`. Se agregó `getPaymentBadgeInfo(sale)`, que ahora cubre: Crédito (azul), Mixto (gris + ícono `Shuffle` de lucide-react, cuando `paymentType === "MIXED"` o hay más de un instrumento en `paymentDetails`), Efectivo (verde), Tarjeta (azul), Transferencia (violeta `violet-100`/`violet-700`, consistente con el uso ya existente de violeta en el archivo), Venta web (celeste) y Otro (gris claro), con "Contado" como fallback si no hay `paymentDetails`. Se corrigió además el tipado de `SaleRecord.paymentType`, que excluía incorrectamente `"MIXED"` (el enum real `SalePaymentType` en el schema sí lo incluye).
**Notas:** El componente sí requería cambios (no estaba "ya implementado"): carecía de paleta para MIXED y de granularidad por instrumento. Solo se tocó sales-list.tsx. No se modificó el schema ni el flujo de cobro. `npm run build`, lint y typecheck ejecutados sin errores. `npm test` repite la misma falla preexistente y no relacionada de `route.integration.test.ts` ("creates a credit sale with debt through the API flow"); sin nuevas fallas.
---

## Tarea 033 — Buscador por número de folio o nombre de cliente — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/modules/sales/sale-data-access.ts, src/app/api/sales/route.ts, src/app/ui/sales-list.tsx
**Cambios realizados:** `listSales` acepta un `q` opcional: si es numérico filtra por `folio` exacto, y siempre agrega `customer.name contains` (insensitive) como alternativa vía `OR`, manteniendo el scope de `tenantId`. `GET /api/sales` lee el query param `q`. En el listado de ventas se agregó un input de texto "Buscar por folio o cliente..." con debounce de 300ms que agrega `?q=...` al fetch y resetea a la página 1; si está vacío, quita el filtro.
**Notas:** No se modificó el schema. `npm run build`, lint y typecheck ejecutados sin errores. `npm test` repite la falla preexistente y no relacionada de `route.integration.test.ts` ("creates a credit sale with debt through the API flow"); la falla de concurrencia en `debt-payment-data-access.integration.test.ts` reapareció por agotamiento del pool de conexiones de Neon bajo carga (ya documentado en tareas previas) y se confirmó como flaky corriendo ese archivo en aislamiento (4/4 tests pasan). Ninguna falla nueva relacionada con esta tarea.
---

## Tarea 032 — Badge visual si la venta fue devuelta total o parcialmente — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/modules/sales/sale-data-access.ts, src/app/ui/sales-list.tsx
**Cambios realizados:** `listSales` calcula ahora `returnStatus` ("NONE"|"PARTIAL"|"FULL") por venta, consultando `ReturnItem` agrupado por `saleId` (sin traer el detalle completo de la devolución) y comparando la cantidad devuelta contra la cantidad total vendida (`SaleItem.quantity`). En el listado de ventas se agregó `ReturnStatusBadge`, mostrado junto al folio de cada venta: "Devuelta" (rojo) si la devolución fue total, "Devolución parcial" (ámbar) si fue parcial, nada si no tuvo devoluciones.
**Notas:** No se modificó el schema ni el flujo de `/returns`. `GET /api/sales/route.ts` no requirió cambios: ya reenvía sin modificaciones el resultado de `listSales`. `npm run build`, lint y typecheck ejecutados sin errores. `npm test` repite la misma falla preexistente y no relacionada de `route.integration.test.ts` ("creates a credit sale with debt through the API flow") ya reportada desde la Tarea 027; sin nuevas fallas.
---

## Tarea 031 — Columna de ganancia bruta en la lista — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/sales-list.tsx
**Cambios realizados:** El `costPrice` del producto ya llegaba desde el backend (`sale-data-access.ts`/`GET /api/sales` sin cambios necesarios). Se agregó `getSaleGrossProfit(sale)`, que suma por ítem `(unitPrice - costPrice) * quantity` para ítems con producto asociado y marca `hasNonProductItems` cuando la venta incluye servicios (sin costo definido). Cada tarjeta de venta muestra ahora "Ganancia: {monto}" bajo el total, en verde si es positiva o rojo si es negativa, con un asterisco y tooltip cuando la venta tiene ítems de servicio no incluidos en el cálculo.
**Notas:** Se corrigió además un tipado incorrecto preexistente: `SaleItemRecord.product`/`productId` se tipaban como siempre presentes, cuando el backend real permite `product: null` en ítems de servicio (con `service` poblado en su lugar). Esto exigió ajustar dos usos no seguros (`productSummary` y la tabla de detalle en `SaleDetailModal`) y filtrar `ReturnModal` para operar solo sobre ítems con producto asociado (las devoluciones nunca soportaron ítems de servicio). Se verificó que exponer `costPrice` no introduce escalamiento de privilegios: `GET /api/sales`, `GET /api/products` y `GET /api/reports/export` ya lo devuelven sin `requireRole`. No se modificó el schema. `npm run build`, lint y typecheck ejecutados sin errores. `npm test` repite la misma falla preexistente y no relacionada de `route.integration.test.ts` ("creates a credit sale with debt through the API flow") ya reportada desde la Tarea 027; sin nuevas fallas.
---

## Tarea 030 — Exportar ventas filtradas a CSV — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/sales-list.tsx
**Cambios realizados:** Se agregó un botón "Exportar CSV" junto a los filtros existentes (deshabilitado si no hay ventas visibles). Genera en el cliente, sin librerías nuevas, un CSV con columnas Folio, Fecha, Vendedor, Cliente, Método de pago y Total a partir de `displayedSales` (las ventas actualmente filtradas/visibles). El método de pago se deriva de `paymentType`/`paymentDetails` ("Crédito", instrumentos combinados como "Efectivo + Tarjeta", o "Contado" como fallback). Valores con comas, comillas o saltos de línea se escapan entre comillas dobles duplicando comillas internas. Descarga con `Blob` + `URL.createObjectURL` + link temporal, nombre `ventas_YYYY-MM-DD.csv`.
**Notas:** No se agregó ninguna librería de CSV ni se tocó el API de ventas. `npm run build`, lint y typecheck ejecutados sin errores. `npm test` repite las mismas 2 fallas preexistentes y no relacionadas ya reportadas en Tareas 027–029.
---

## Tarea 029 — Vista agrupada por día con subtotal diario en el listado de ventas — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/sales-list.tsx
**Cambios realizados:** Se agregó un checkbox "Agrupar por día" (desactivado por defecto) junto a los filtros existentes. Al activarlo, las ventas ya cargadas (`displayedSales`) se agrupan en el cliente por fecha local (`localDayKey`, sin nuevas llamadas a la API) y se renderiza un encabezado por día ("Lunes 30 de junio", cantidad de ventas y subtotal en ARS con `formatARS`) seguido de las mismas tarjetas de venta (`SaleCards`) ya existentes.
**Notas:** Agrupado puramente client-side sobre los datos ya paginados/filtrados; no se tocó el API de ventas ni el schema. `npm run build`, lint y typecheck ejecutados sin errores. `npm test` repite las mismas 2 fallas preexistentes y no relacionadas ya reportadas en Tareas 027/028.
---

## Tarea 028 — Filtro por método de pago en el listado de ventas — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/modules/sales/sale-data-access.ts, src/app/api/sales/route.ts, src/app/ui/sales-list.tsx
**Cambios realizados:** `PaginationParams`/`listSales` aceptan `paymentType` (enum existente `CASH|CREDIT|MIXED`) y `paymentMethod` (instrumento dentro de `paymentDetails`, el JSON de splits ya usado por el POS: Efectivo/Tarjeta/Transferencia/VentaWeb/Otro), filtrando este último con `array_contains` sobre el arreglo de splits. El endpoint `GET /api/sales` lee ambos query params. En el listado de ventas se agregó un `<select>` "Todos los métodos de pago" con las opciones Efectivo, Tarjeta, Transferencia, Venta web, Otro y Crédito (esta última mapea a `paymentType=CREDIT`).
**Notas:** No se modificó el schema ni se inventó un enum nuevo; se reutilizó la estructura de `paymentDetails` ya poblada por el checkout del POS. Al validar con la suite completa se repitieron las mismas 2 fallas ya conocidas y no relacionadas (conexión Neon agotada bajo carga en `debt-payment-data-access.integration.test.ts` — pasa en aislamiento; y la falla preexistente de `route.integration.test.ts` reportada en la Tarea 027). Ninguna corregida por estar fuera de alcance. `npm run build`, lint y typecheck ejecutados sin errores.
---

## Tarea 027 — Filtro por vendedor en el listado de ventas — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/modules/sales/sale-data-access.ts, src/app/api/sales/route.ts, src/app/ui/sales-list.tsx
**Cambios realizados:** `PaginationParams` y `listSales` aceptan un `sellerCode` opcional que se agrega al `where` de Prisma. El endpoint `GET /api/sales` lee `sellerCode` de los query params. En el listado de ventas se agregó un `<select>` para filtrar por vendedor, cuyas opciones se acumulan en un estado separado a partir de los códigos de vendedor ya recibidos en cada respuesta (no desaparecen al aplicar el filtro).
**Notas:** No se agregaron endpoints nuevos ni cambios de schema (`Sale.sellerCode` ya existía). Durante la validación se detectó una falla preexistente y no relacionada en `src/app/api/sales/route.integration.test.ts` ("creates a credit sale with debt through the API flow") — confirmada como preexistente comparando con el commit anterior vía `git stash` (falla igual sin estos cambios). Fuera de alcance de esta tarea, no corregida. `npm run build`, lint y typecheck ejecutados sin errores.
---

## Tarea 026 — Feedback visual al agregar ítem al carrito — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/pos.tsx
**Cambios realizados:** `addToCart` y `addServiceToCart` (usados por el buscador, el atajo Enter, el grid de más vendidos y los servicios) ahora disparan `triggerAddFeedback`, que aplica `animate-pulse` (Tailwind nativo) durante 350ms sobre la fila del carrito recién agregada/incrementada y sobre el badge contador de unidades en el header del carrito.
**Notas:** Sin librerías nuevas ni cambios a tailwind.config.ts. `npm run build`, lint y typecheck ejecutados sin errores.
---

## Tarea 025 — Resaltar en rojo el ítem del carrito sin stock restante — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/pos.tsx
**Cambios realizados:** Cada fila del carrito calcula `remainingStock = item.maxStock - item.quantity` (sin llamadas nuevas a la API). Si es 0, la fila muestra un borde rojo sutil (`ring-1 ring-red-400`) y el texto "Sin stock restante". Si es negativo, el borde es más fuerte (`ring-1 ring-red-500`) y el texto cambia a "Cantidad supera el stock disponible".
**Notas:** No se duplicó lógica de bloqueo: la cantidad ya no puede superar `maxStock` por los guards existentes (`updateQuantity`, `commitQuantityInput`/`invalidQuantityIds`, botón `+` deshabilitado), por lo que el caso negativo es solo defensivo. `npm run build`, lint y typecheck ejecutados sin errores.
---

## Tarea 024 — Foco automático en el buscador de productos del POS — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/pos.tsx
**Cambios realizados:** Se agregó `searchInputRef` al input de búsqueda de productos y un `useEffect` que le da foco al montar el componente, y cada vez que se cierra un modal/panel que lo tapaba (nota, cotización, promociones, cobro, impresión, factura ARCA, sale gate) — incluye el momento posterior a completar una venta, ya que el modal de impresión se abre y cierra en ese flujo. No roba el foco si el usuario ya está escribiendo en otro input o textarea.
**Notas:** Se removió el atributo `autoFocus` nativo, reemplazado por el manejo explícito vía ref/effect. Sin pendientes. `npm run build`, lint y typecheck ejecutados sin errores.
---

## Tarea 023 — Pantalla post-venta con folio, monto y botón de compartir por WhatsApp — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/pos.tsx
**Cambios realizados:** Se amplió el panel "Última venta" existente (Tarea 019): folio y total ahora se muestran en tipografía grande (text-2xl). Se agregó un botón "Compartir" que arma un mensaje de texto (nombre del negocio, folio, fecha, ítems y total en ARS) y lo envía a `https://wa.me/?text=...` en una pestaña nueva, sin número fijo.
**Notas:** Se reutilizó el fetch existente a `/api/settings` para obtener `businessName` (sin llamada nueva). Sin pendientes. `npm run build`, lint y typecheck ejecutados sin errores.
---

## Tarea 022 — Modo oscuro configurable para el POS — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/pos.tsx
**Cambios realizados:** Se agregó un ícono Sun/Moon en la barra superior del POS para activar/desactivar un modo oscuro (fondo gris muy oscuro, texto claro), persistido en localStorage bajo `solven_pos_dark_mode` (default: desactivado). Implementado con variantes arbitrarias de Tailwind (`[.pos-dark_&]:`) sin modificar `tailwind.config.ts`, aplicado sólo al contenedor principal del POS (pestañas, panel de productos y carrito). El acento violeta `#7c3aed` de los botones activos se mantiene visible en modo oscuro.
**Notas:** Los modales (pago/checkout, nota, promociones, impresión, ARCA) se dejaron deliberadamente en tema claro para acotar el alcance a la prioridad 🟢 BAJO de la tarea. `npm run build`, lint y typecheck ejecutados sin errores.
---

## Tarea 021 — Sonido de confirmación configurable al completar una venta — 2026-07-02
**Estado:** ✅ Completada
**Archivos modificados:** src/app/ui/pos.tsx
**Cambios realizados:** Al confirmar una venta se reproduce un beep corto generado con Web Audio API (oscilador nativo, sin archivos ni dependencias). Se agregó un ícono Volume2/VolumeX en la barra superior del POS para activar/desactivar el sonido, persistido en localStorage bajo `solven_pos_sound_enabled` (default: activado). Si está desactivado, no se reproduce nada al confirmar.
**Notas:** Sin pendientes. `npm run build`, lint y typecheck ejecutados sin errores.
---

Historial de Tareas 001–020 revisado y archivado por el Ingeniero Líder.
