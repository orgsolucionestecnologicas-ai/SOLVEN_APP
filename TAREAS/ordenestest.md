# ÓRDENES DE TESTEO — SOLVEN

> Archivo de trabajo de INGENIERODETESTEO (ver `TAREAS/INGENIERODETESTEO.md`
> para el protocolo completo). Acá se acumulan los hallazgos de la auditoría
> proactiva de edge cases, sección por sección, más reciente arriba. No se
> vacía entre ciclos como `REPORTE_DE_CAMBIOS.md` — es el historial completo
> de todo lo auditado, para no repetir trabajo.

## Inventario — auditado 01-09-2026

> Punto de partida: 20 escenarios hipotéticos de "día normal" para
> Inventario/Productos, discutidos con Diego antes de leer código.
> Contrastados contra `src/modules/inventory`, `src/modules/products`,
> `src/modules/categories`, `src/modules/suppliers`, `prisma/schema.prisma`
> y las rutas de `src/app/api/inventory-adjustments`,
> `src/app/api/inventory-movements` y `src/app/api/products`. Los fixes de
> abajo buscan la mejor práctica para un comercio real con múltiples
> locales/clientes en la misma plataforma: que ajustar o borrar un producto
> nunca pueda tocar el stock de otro comercio, nunca pueda perder el rastro
> de qué pasó con el stock, y que borrar algo con historial de ventas se
> comporte como en Categorías (que ya bloquea el borrado correctamente) en
> vez de romper silenciosamente los registros de ventas pasadas.

### Bugs confirmados — ORDEN para el agente ejecutor (VS Code)

**INV-FIX-01 (CRÍTICO) — Ajuste manual de stock sin aislamiento por tenant**
- Archivo: `src/modules/inventory/stock-adjustment.ts`, función `adjustProductStock`.
- Qué pasa: recibe `tenantId` como parámetro pero nunca lo usa para filtrar
  el producto. `transaction.product.findUniqueOrThrow({ where: { id: ... } })`
  y `transaction.product.update({ where: { id: ... }, data: { stock: ... } })`
  solo filtran por `id`. Cualquier usuario con permiso de ajuste de stock en
  SU comercio puede ajustar el stock de un producto de OTRO comercio si
  adivina o reutiliza un `productId` ajeno (viola la regla de oro de
  CLAUDE.md: "TODOS los queries Prisma deben tener `where: { tenantId }`.
  Sin excepción"). El `tenantId` sí llega correcto desde
  `src/app/api/inventory-adjustments/route.ts` (usa `requireRole` bien) —
  el bug está solo en la capa de datos, que lo ignora.
- Qué hacer: agregar `tenantId` al `where` de ambos queries:
  `transaction.product.findFirstOrThrow({ where: { id: validatedAdjustment.productId, tenantId } })`
  y el `update` correspondiente con `where: { id: validatedAdjustment.productId, tenantId }`.
  Esto ya es el patrón correcto usado en `product-data-access.ts`
  (`getProductById`, `updateProduct`) — solo hay que aplicarlo acá también.

**INV-FIX-02 (ALTO) — Ajuste de stock no es atómico, puede perder cambios concurrentes**
- Archivo: `src/modules/inventory/stock-adjustment.ts`, misma función.
- Qué pasa: lee `previousStock`, calcula `quantityChange`, y hace
  `update({ data: { stock: newStock } })` como un SET absoluto. Si entre la
  lectura y la escritura una venta o devolución modifica el stock del mismo
  producto, ese cambio se pisa silenciosamente (el ajuste manual "gana" sin
  saberlo, y el `InventoryMovement` queda con un `previousStock` que ya no
  es real). Es el mismo patrón de carrera ya resuelto en
  `sale-data-access.ts` (UPDATE condicional con `WHERE stock >= quantity`).
- Qué hacer: la mejor práctica acá es tratar el ajuste manual como una
  corrección declarativa protegida por optimistic locking, no como un SET
  ciego. Releer el `stock` actual dentro de la misma transacción justo
  antes de escribir (ya se hace) pero usar un UPDATE condicional:
  `UPDATE "Product" SET stock = $newStock WHERE id = $id AND tenantId = $tenantId AND stock = $previousStockLeídoEnLaMismaTx RETURNING *`
  (raw SQL, mismo estilo que `reduceProductStock`); si `RETURNING` no
  devuelve fila, relanzar con stock recién leído (retry) o devolver un error
  claro de "el stock cambió mientras ajustabas, volvé a intentar" en vez de
  pisar el dato en silencio.

**INV-FIX-03 (MEDIO) — Ajuste manual de stock sin registro de auditoría**
- Archivo: `src/modules/inventory/stock-adjustment.ts`.
- Qué pasa: no hay ningún `logAudit(...)` en toda la función. Un ajuste
  manual de stock (que puede ocultar mermas, robos o errores de conteo) no
  queda en el `AuditLog`, solo en `InventoryMovement` (que registra el
  cambio de stock pero no quién lo hizo desde la perspectiva de auditoría
  general del sistema).
- Qué hacer: agregar `void logAudit({ tenantId, userId, action: "STOCK_ADJUSTED", entityType: "Product", entityId: product.id, metadata: { previousStock, newStock, reason } })`
  siguiendo el mismo patrón ya usado en `updateProduct` (`PRODUCT_PRICE_CHANGE`).
  Va a requerir agregar `userId` como parámetro de `adjustProductStock` (ya
  está disponible en la ruta vía `requireRole`).

**INV-FIX-04 (ALTO) — Borrar un producto usa solo `requireTenantId()`, no `requireRole()`**
- Archivo: `src/app/api/products/[id]/route.ts`, handler `DELETE`.
- Qué pasa: a diferencia de `PUT` en el mismo archivo (que correctamente
  exige `requireRole(["OWNER", "INVENTORY"], "products")`), el `DELETE`
  solo llama `requireTenantId()` — cualquier usuario autenticado del
  comercio (por ejemplo un CASHIER sin permiso de inventario) puede borrar
  productos, no solo editarlos. Es más grave que el patrón de solo-lectura
  ya visto en otras secciones porque acá es una acción destructiva.
- Qué hacer: cambiar el `DELETE` para usar
  `requireRole(["OWNER", "INVENTORY"], "products")` igual que `PUT`, y
  registrar el `logAudit` de `PRODUCT_DELETED` con el `userId` que ya
  devuelve `requireRole` (hoy lo saca de `getSession()` aparte, se puede
  simplificar).

**INV-FIX-05 (ALTO) — Borrar un producto con historial de ventas rompe o corrompe datos**
- Archivo: `src/app/api/products/[id]/route.ts` (`DELETE`),
  `prisma/schema.prisma` (relación `SaleItem.product`, migración
  `20260515201138`, cambiada a `ON DELETE SET NULL`); relación
  `InventoryMovement.product` sigue en `ON DELETE RESTRICT`.
- Qué pasa: hoy `DELETE` borra el producto sin ninguna validación previa.
  Si el producto ya tiene ventas asociadas pero ningún `InventoryMovement`
  registrado, el borrado "funciona" pero deja los `SaleItem.productId` de
  esas ventas en `NULL` — se pierde para siempre qué producto se vendió en
  esa venta pasada (afecta reportes, ARCA/facturación histórica y
  devoluciones, que buscan por `productId`). Si el producto sí tiene
  `InventoryMovement` (ajustes de stock previos), el borrado falla por la
  restricción de la base de datos con un error crudo, que el `catch` de la
  ruta convierte en un mensaje genérico ("No se pudo eliminar el
  producto.") sin explicarle al dueño por qué ni qué hacer. El sistema ya
  tiene la solución correcta implementada para Categorías
  (`deleteCategory` bloquea el borrado si `_count.products > 0`) y el
  propio modelo `Product` ya tiene un campo `active: Boolean` pensado
  exactamente para este caso (desactivar en vez de borrar).
- Qué hacer: en `DELETE`, antes de borrar, verificar si el producto tiene
  historial real: `const hasSales = await prisma.saleItem.findFirst({ where: { productId: id } })`.
  Si existe, no borrar: devolver un error claro
  ("Este producto tiene ventas registradas. Para dejar de venderlo, desactivalo en vez de eliminarlo.")
  y, si el frontend lo permite, ofrecer directamente hacer
  `updateProduct(id, { active: false }, tenantId, userId)` como acción
  alternativa desde el mismo botón. El borrado físico (`prisma.product.delete`)
  queda reservado solo para productos sin ningún `SaleItem` ni
  `InventoryMovement` (creados por error, nunca vendidos ni ajustados).

**INV-FIX-06 (MEDIO-ALTO) — `productCode` es único a nivel global, no por comercio**
- Archivo: `prisma/schema.prisma`, modelo `Product` (línea ~156:
  `productCode String? @unique`); `src/modules/products/product-data-access.ts`,
  función `importProducts`.
- Qué pasa: la restricción es `@unique` global sobre toda la plataforma,
  no `@@unique([tenantId, productCode])` como sí está bien hecho en
  `Supplier` (`@@unique([name, tenantId])`). En el día a día esto no se
  nota con los códigos autogenerados (`generateCode`, secuenciales), pero
  `importProducts` permite subir un `productCode` propio por fila (para
  importación masiva/CSV). Si dos comercios distintos de la plataforma
  eligen el mismo código (algo totalmente plausible: "COD001", "P-01",
  etc.), el `INSERT` del segundo comercio falla por violación de constraint
  a nivel de base de datos, y ese error cae en el `catch` genérico de
  `importProducts` como "Error desconocido al procesar la fila." — sin
  ninguna pista de que la causa real es una colisión con OTRO comercio, algo
  que el dueño no tiene forma de saber ni de solucionar por su cuenta.
- Qué hacer: cambiar el schema a
  `@@unique([tenantId, productCode])` (eliminando el `@unique` suelto en el
  campo) y generar la migración correspondiente. Revisar que no haya datos
  existentes que ya colisionen entre tenants antes de aplicar la migración
  en producción (si los hay, resolver con un `productCode` sufijado antes
  del `ALTER TABLE`).

**INV-FIX-07 (MEDIO) — Alta de producto no genera movimiento de inventario para el stock inicial**
- Archivo: `src/modules/products/product-data-access.ts`, función `createProduct`.
- Qué pasa: al crear un producto con `stock` inicial > 0, ese stock queda
  guardado en `Product.stock` pero no se crea ningún `InventoryMovement`
  que lo explique. Comparado contra cualquier otro cambio de stock del
  sistema (venta, devolución, ajuste manual), el stock inicial es el único
  que "aparece de la nada" sin dejar rastro en el historial de movimientos
  que ve el dueño.
- Qué hacer: dentro de `createProduct`, después de crear el producto, si
  `validatedProduct.stock > 0` crear un `InventoryMovement` con
  `reason: "Stock inicial de alta de producto"`, `previousStock: 0`,
  `newStock: validatedProduct.stock`, `quantityChange: validatedProduct.stock`.
  Envolver la creación del producto + el movimiento en un
  `prisma.$transaction` para que ambos queden o ninguno.

**INV-FIX-08 (BAJO-MEDIO) — Listado de movimientos de inventario sin control de rol**
- Archivo: `src/app/api/inventory-movements/route.ts`, handler `GET`.
- Qué pasa: mismo patrón sistémico ya encontrado y corregido en POS
  (`GET /api/sales`), Devoluciones (`GET /api/returns`) y Caja
  (`GET /api/cash-register/[id]`, `GET /api/cash-register/sessions`): usa
  solo `requireTenantId()` en vez de `requireRole(...)`, así que cualquier
  usuario autenticado del comercio puede ver el historial completo de
  movimientos de stock, incluso si su rol no tiene permiso de sección
  "products"/inventario.
- Qué hacer: cambiar a
  `requireRole(["OWNER", "INVENTORY"], "products")` (o el set de roles que
  ya usa `POST /api/inventory-adjustments` para consistencia), igual que se
  hizo en las secciones anteriores.

**INV-FIX-09 (BAJO) — Alerta de stock bajo sin throttling, puede spamear al dueño**
- Archivo: `src/lib/email-alerts.ts`, función `notifyLowStockIfEnabled`;
  `src/modules/sales/sale-data-access.ts` (dispara en cada venta que deja
  un producto por debajo de `minStock`).
- Qué pasa: a diferencia de la alerta de diferencia de caja (que ya tiene
  un umbral de 0.005 para evitar ruido), la de stock bajo no tiene ninguna
  deduplicación: si un producto con poco stock se sigue vendiendo durante
  el día (por ejemplo, quedan 2 unidades y entran ventas de a 1), el dueño
  recibe un email por cada venta que lo mantenga bajo mínimo, pudiendo
  llegar a decenas de emails el mismo día por el mismo producto.
- Qué hacer: la mejor práctica es no alertar dos veces por el mismo
  producto en la misma ventana de tiempo. Agregar un `StoreSettings` o
  campo simple tipo `lastLowStockAlertAt` por producto (o una tabla liviana
  `productId -> lastNotifiedAt`), y en `notifyLowStockIfEnabled` filtrar
  los productos que ya fueron notificados en las últimas, por ejemplo, 12
  horas antes de mandar el email. Alternativa más simple si no se quiere
  tocar el schema: agrupar el envío en un resumen diario (cron) en vez de
  en tiempo real por venta.

**INV-FIX-10 (MEDIO) — Se puede vender/guardar un producto con precio de venta por debajo del costo, sin ninguna advertencia**
- Archivo: `src/modules/products/product-validation.ts`, funciones
  `validateCreateProductInput` y `validateUpdateProductInput`.
- Qué pasa: ambas funciones validan que `costPrice` y `salePrice` sean
  números no negativos, pero nunca comparan uno contra el otro. Se puede
  crear o editar un producto con `salePrice < costPrice` (por ejemplo, un
  error de tipeo al cargar precios) sin ningún aviso, y el sistema lo va a
  vender a pérdida silenciosamente en cada venta.
- Qué hacer: esto no debería bloquear la operación (puede haber
  liquidaciones intencionales), pero sí la mejor práctica es avisar. Igual
  que ya se hace con `PRODUCT_PRICE_CHANGE` vía `logAudit`, devolver desde
  `validateCreateProductInput`/`validateUpdateProductInput` (o desde la
  ruta que las llama) una advertencia no bloqueante en la respuesta cuando
  `salePrice < costPrice`, para que el frontend la muestre como
  confirmación ("Este precio de venta es menor al costo, ¿confirmás?") en
  vez de dejarlo pasar sin que nadie lo note.

### Al terminar

1. `npm run lint && npm run typecheck && npm test` — todo debe pasar antes
   de commitear.
2. Commit + push con mensaje descriptivo (ej.
   `fix(inventory): tenant isolation, atomic stock adjustment, safe product deletion`).
3. Agregar una entrada corta a `TAREAS/REPORTELIDER.md` — no es necesario
   redactarla en detalle, solo dejar constancia de qué se tocó.
4. Entregable breve acá mismo: archivos modificados, resultado de
   typecheck, hash de commit.
5. No te autocertifiques como "verificado" — eso lo revisa el Ingeniero
   Líder mirando el diff real.

### Verificado correcto (no ordenar fix)

1. `stock-adjustment-validation.ts`: `reason` es obligatorio (no vacío) y
   `newStock` debe ser entero no negativo — motivo obligatorio y stock
   negativo ya están cubiertos.
2. `deleteCategory` (`category-data-access.ts`) bloquea correctamente el
   borrado si la categoría tiene productos o subcategorías asociadas —
   patrón correcto que debería replicarse en el borrado de productos (ver
   INV-FIX-05).
3. El precio y el IVA de una venta quedan "congelados" por línea en
   `SaleItem` (`unitPrice`, `ivaRate`, `total` son campos propios,
   independientes de `Product`) — cambiar el precio o el IVA de un producto
   hoy nunca afecta retroactivamente ventas ya facturadas.
4. `product-data-access.ts`: `listProducts`, `getProductById`,
   `updateProduct` (y la parte de creación/edición de `importProducts`)
   están correctamente scopeados por `tenantId` en sus queries — el bug de
   aislamiento de INV-FIX-01 es una excepción puntual de
   `stock-adjustment.ts`, no un patrón general del módulo de productos.
5. `updateProduct` ya registra en `AuditLog` los cambios de `costPrice`/
   `salePrice` vía `logAudit` (`PRODUCT_PRICE_CHANGE`) — buena base para
   extender el mismo criterio a INV-FIX-03 y INV-FIX-10.
6. `importProducts` procesa cada fila del CSV dentro de un único
   `$transaction`, pero aísla los errores por fila (`try/catch` individual,
   acumulando en `errors: []`) en vez de abortar toda la importación por un
   solo error — permite importar 500 filas y que solo fallen las 3
   problemáticas.
7. `POST /api/inventory-adjustments` y `PUT /api/products/[id]` usan
   correctamente `requireRole(["OWNER", "INVENTORY"], "products")`.
8. `Supplier` no tiene endpoint de borrado implementado (`supplier-data-access.ts`
   solo tiene `listSuppliers`/`createSupplier`) — no aplica el escenario de
   borrar un proveedor con productos asociados porque esa acción no existe
   todavía.

### Inconcluso (necesita reproducción en vivo o decisión de producto)

1. El "stock reservado" por cotizaciones pendientes
   (`getReservedStockByProduct`, `src/modules/quotes`) es puramente
   informativo: se calcula y se muestra en `quotes-list.tsx` y en
   `GET /api/quotes/reserved-stock`, pero no se usa en ningún lado para
   bloquear o descontar stock al crear una venta o confirmar otra
   cotización. Pregunta de producto: ¿está bien que dos cotizaciones
   puedan "prometer" la misma última unidad a dos clientes distintos (el
   que confirme primero se la lleva, el otro se entera recién al intentar
   confirmar), o debería reservarse stock de verdad al emitir la
   cotización?
2. El contador global de `productCode` autogenerado (`CodeCounter`, en
   `src/lib/generate-code.ts`) es compartido entre TODOS los comercios de
   la plataforma (no por tenant) — no rompe nada funcionalmente, pero un
   comercio nuevo puede ver que sus primeros productos arrancan en
   "PROD-0347" en vez de "PROD-0001", lo cual puede generar dudas de
   soporte ("¿por qué mi primer producto no es el 0001?"). No lo marco
   como bug porque no causa ningún error real, solo lo dejo anotado por si
   en algún momento se decide que valga la pena que cada comercio tenga su
   propia numeración.
3. No llegué a confirmar en un entorno vivo el comportamiento exacto del
   `DELETE` de producto cuando el producto SÍ tiene `InventoryMovement`
   (debería fallar por `ON DELETE RESTRICT` a nivel de base de datos) —
   está confirmado por el SQL de la migración pero no reproducido con una
   llamada real a la API. Si INV-FIX-05 se implementa como se describe, este
   punto queda resuelto de una — no debería ser necesario reproducirlo por
   separado.

---

## Caja — auditado 31-08-2026

> Punto de partida: 20 escenarios hipotéticos de "día normal" para Caja,
> discutidos con Diego antes de leer código. Contrastados contra
> `src/modules/cash-register`, `src/modules/cash`, `src/modules/expenses`,
> `src/modules/debts` y las rutas de `src/app/api/cash-register` y
> `src/app/api/cash-movements`. Los fixes de abajo están pensados no solo
> para tapar el bug sino como la mejor práctica contable para un comercio
> real: que el número que el sistema espera en el cajón sea siempre el
> número que un dueño puede confiar de memoria, sin tener que auditar cada
> diferencia a mano.

### Bugs confirmados

> Orden ya entregada al agente ejecutor (CAJA-FIX-01 a 05) y removida de acá para que no se repita. Efecto colateral real detectado y ya resuelto por separado: el cron de gastos recurrentes no aislaba fallas por tenant (ver `REPORTELIDER.md`, 01-09-2026). Resultado real: ver commits + `TAREAS/REPORTELIDER.md`.

### Verificado correcto (no ordenar fix)

- Apertura/cierre de caja con monto negativo o no numérico — validado explícitamente (`Number.isFinite`, `>= 0`) en `cash-register-validation.ts:47-52` y `:82-86`.
- Doble cierre de la misma sesión, caso simple (no concurrente) — bloqueado explícitamente por `CashRegisterAlreadyClosedError` (la falla es solo bajo concurrencia real, ver CAJA-FIX-05).
- Ajuste manual de caja sin motivo — bloqueado: `source === "MANUAL"` exige `note` no vacía, `cash-movement-validation.ts:56-58`.
- Gastos y pagos de deuda generan movimiento de caja (no quedan invisibles del arqueo, más allá del problema de método de pago de CAJA-FIX-02) — `expense-data-access.ts:27-34`, `debt-payment-data-access.ts:52-58`.
- Pagos de deuda concurrentes sobre el mismo saldo — protegidos con `updateMany` condicionado (`remainingAmount: { gte: paymentAmount }`) más reintento ante conflicto de transacción (`P2028`/`P2034`) — `debt-payment-data-access.ts:35-42,66-73`.
- Alerta por diferencia de caja al cierre — existe, opt-in por tenant (`StoreSettings.cashDifferenceEmailAlerts`), con umbral que ignora diferencias de centavos por redondeo (`< 0.005`) — `email-alerts.ts:29-40`.
- Movimientos de caja de otro tenant filtrándose en la agregación de un cierre — todas las queries de `closeSession` están correctamente scoped por `tenantId`.
- Negocio que opera cruzando medianoche — `closeSession` agrega movimientos por `createdAt >= session.openedAt` sin ningún corte de "día calendario", así que una sesión larga que cruza la medianoche no tiene ningún problema de corte de fecha.
- `GET /api/cash-movements` y `POST /api/cash-movements` — sí exigen `requireRole([...], "cashMovements")` correctamente.

### Inconcluso (necesita reproducción en vivo o decisión de producto)

- El desglose por denominación (`openingBreakdown`/`closingBreakdown`) se guarda como JSON libre (`unknown`) sin validar que la suma de billetes/monedas coincida con `openingAmount`/`closingAmount`. Puede ser intencional (el desglose es solo referencia visual para quien cuenta el cajón, no una fuente de verdad) — confirmar con Diego si vale la pena validarlo o si arruinaría la flexibilidad de cargarlo.
- Cambio de turno sin cerrar caja — `cashierName` es texto libre, no una relación a `User`, así que no se pudo determinar leyendo el backend si el cajero entrante ve alguna advertencia de que la sesión abierta es de otra persona. Requiere revisión de la UI en vivo (`app-shell.tsx` / la pantalla de apertura de caja).
- Reporte/PDF de cierre de caja — no se revisó el componente de impresión para confirmar que reutiliza los mismos números guardados en `CashRegisterSession` en vez de recalcularlos aparte (mismo tipo de riesgo que ya vimos con reportes duplicando lógica en otras secciones). A revisar si se prioriza.

---

## Devoluciones — auditado 31-08-2026

> Punto de partida: 20 escenarios hipotéticos de "día normal" para
> Devoluciones, discutidos con Diego antes de leer código (incluye
> re-verificar el hallazgo suelto de MIXED/Debt registrado antes de que
> INGENIERODETESTEO existiera como rol formal — esa entrada vieja se
> reemplaza por esta). Contrastados contra `src/modules/returns`,
> `src/app/api/returns`, y lo necesario de `sales`, `cash-register`,
> `invoices`/ARCA y `audit`.

### Bugs confirmados

> Orden ya entregada al agente ejecutor (RET-FIX-01 a 07) y removida de acá para que no se repita. RET-FIX-06 (devolver venta de Servicio) quedó diferido como pregunta de producto, no implementado — sigue pendiente si Diego confirma que es un caso real. Resultado real: ver commits + `TAREAS/REPORTELIDER.md`.

### Verificado correcto (no ordenar fix)

- Devolver más cantidad de la vendida dentro de un único request — validado correctamente contra `saleItem.quantity` menos lo ya devuelto (la falla es solo bajo concurrencia, ver RET-FIX-01) — `returns/index.ts:258-273`.
- Devolución de una venta de otro tenant — bloqueada por el scope `tenantId` en `tx.sale.findFirst`, `returns/index.ts:216-219`.
- Deuda inexistente/ya saldada en una devolución de venta a crédito — manejado con gracia (`if (debt) {...}`), no rompe — `returns/index.ts:318-326`.
- Motivo de devolución obligatorio — validado tanto en la API (400 si falta) como dentro de `processReturn` — `route.ts:100-105`, `returns/index.ts:213-215`.
- Movimiento de caja solo se crea cuando el reintegro es en "Efectivo" — correcto en principio, tarjeta/transferencia no mueven el cajón físico — `returns/index.ts:305-312`.

### Inconcluso (necesita reproducción en vivo o decisión de producto)

- El método de reintegro elegido no se valida contra el desglose real de pago de la venta (`Sale.paymentDetails`) — en una venta MIXED se puede elegir reintegrar "Efectivo" aunque esa venta se haya cobrado por tarjeta+fiado, generando un `CashMovement` OUT que no corresponde a plata que realmente entró en el cajón por esa venta (rompe el arqueo). Puede ser una decisión de negocio válida (el comercio decide cómo reintegra, sin importar cómo cobró) — confirmar con Diego si el sistema debería restringir el método de reintegro a los métodos realmente usados en la venta original.
- Devolución de una venta ya facturada por ARCA no genera ninguna Nota de Crédito fiscal ante AFIP — solo existe `src/app/ui/return-credit-note-pdf.tsx`, un comprobante interno impreso, sin ninguna llamada a `src/lib/arca`/WSFE. Para un negocio en producción con clientes reales que ya factura, esto puede ser un gap de cumplimiento fiscal (AFIP espera una Nota de Crédito real, no solo un PDF interno). No es un fix chico de código — es una feature completa (nuevo tipo de comprobante WSFE) que falta. Pregunta importante para Diego, a priorizar aparte de los RET-FIX de arriba.
- Dos líneas de `SaleItem` para el mismo `productId` en una sola venta — si esto llegara a ser posible (hoy el carrito del POS fusiona por `productId` antes de mandar la venta, así que no se pudo reproducir desde la UI actual), `processReturn` solo consideraría la última línea al agrupar por `productId` en un `Map` (`returns/index.ts:216`), ignorando la otra. Requiere revisión si en el futuro cambia el flujo de carga del carrito o se agrega una vía alternativa de creación de ventas (ej. importación).

---

## Punto de Venta (POS) / Ventas — auditado 31-08-2026

> Punto de partida: lista de 20 escenarios hipotéticos de "día normal" (POS)
> discutida con Diego antes de leer código. Los 20 fueron contrastados contra
> `src/modules/sales`, `src/app/ui/pos.tsx`, `src/modules/quotes`,
> `src/modules/invoices`, `src/lib/tenant.ts`. Resultado abajo.

### Bugs confirmados

> Orden ya entregada al agente ejecutor (POS-FIX-01 a 04) y removida de acá para que no se repita. Resultado real: ver commits + `TAREAS/REPORTELIDER.md`.

### Verificado correcto (no ordenar fix)

- Venta sin stock suficiente — bloqueada atómicamente a nivel SQL (`UPDATE "Product" ... WHERE stock >= quantity`), `sale-data-access.ts:503-521`. Cubre también la concurrencia entre dos cajeros vendiendo el mismo producto al mismo tiempo.
- Doble click en "Confirmar venta" dentro del POS — botón deshabilitado mientras `isSubmitting`, `pos.tsx:3392-3407`.
- Venta CREDIT/MIXED sin cliente seleccionado — validado explícitamente, `sale-validation.ts:91`.
- Límite de crédito del cliente — se verifica contra la deuda acumulada real antes de fiar, excepto para el rol OWNER (bypass intencional) o clientes sin límite configurado — `sale-data-access.ts:187-199`.
- Escanear/agregar dos veces el mismo producto al carrito — suma cantidad al ítem existente en vez de duplicar la línea, respetando el stock máximo cacheado — `pos.tsx:1180-1210`.
- Doble factura ARCA sobre la misma venta — bloqueada por chequeo explícito (`existing` por `saleId`) más el constraint único de `Invoice.saleId` como respaldo ante una carrera — `invoice-data-access.ts:34-37`.
- `ivaRate` de servicios — tiene default `0.21` a nivel de schema, no puede quedar "sin configurar" en null, coherente con FIX-10.

### Inconcluso (necesita reproducción en vivo o decisión de producto)

- Redondeo de centavos de IVA al sumar líneas con tasas mixtas (10.5%/21%/27% en un mismo carrito) — no se verificó si puede aparecer un centavo de diferencia entre la suma de `SaleItem.total` y el total mostrado; requiere prueba con casos reales.
- Cambio de precio de un producto mientras está en el carrito — el backend recalcula el precio real al confirmar (correcto para no cobrar de más/de menos por accidente), pero si el precio cambió entre agregar al carrito y confirmar, el monto que el cajero cobró (basado en el precio viejo mostrado en pantalla) puede no coincidir con lo que el backend espera en una venta MIXED, y no hay ningún aviso al cajero de que el precio cambió a mitad de venta.
- Cierre de caja con una venta a medio confirmar — el chequeo de "caja abierta" (`sale-data-access.ts:106-110`) se hace ANTES de abrir la transacción de la venta, no adentro. Existe en teoría una ventana de carrera muy angosta entre ese chequeo y un cierre de caja desde otro dispositivo, que dejaría el `CashMovement` de esa venta fuera del rango contado tanto por el cierre en curso como por el próximo que se abra. Ventana demasiado angosta para confirmar solo leyendo código.
- Emisión de factura ARCA con la conexión cortada a mitad de camino, o doble click en "Emitir factura" mientras AFIP tarda en responder — el constraint único de `Invoice.saleId` evita el duplicado en la base local, pero si AFIP ya emitió un CAE real para el segundo intento antes de que el `INSERT` local falle por duplicado, ese comprobante queda "vivo" en AFIP sin registro local. Requiere reproducción contra el ambiente de homologación de ARCA.
- Una sola sesión de caja abierta por tenant, no por cajero/terminal — si el negocio real llega a operar con más de una caja física en simultáneo, todos los movimientos se mezclan en una sola sesión. No está claro si es una limitación conocida o una decisión de producto deliberada — pregunta para Diego, no bug.
- Pérdida del carrito en curso al cambiar de pestaña dentro del POS (Venta actual → Historial → Devoluciones) — no se revisó el manejo de estado de React en detalle, requiere prueba manual en vivo.
- Corte de sesión de otro usuario mientras un cajero tiene una venta a medio cobrar — depende del comportamiento del middleware/sesión en vivo, no se puede confirmar solo con lectura de código.
- "Anular/cancelar una venta ya impactada en caja y stock" — no existe esa función en `src/modules/sales` ni en la API (solo aparece nombrada en un test). La única forma de revertir una venta hoy es por Devoluciones, ya auditado por separado (ver la entrada de Devoluciones, arriba de esta). No es un bug, es una función que no existe.

---
