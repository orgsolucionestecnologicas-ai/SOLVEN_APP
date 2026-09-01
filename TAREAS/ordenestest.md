# ÓRDENES DE TESTEO — SOLVEN

> Archivo de trabajo de INGENIERODETESTEO (ver `TAREAS/INGENIERODETESTEO.md`
> para el protocolo completo). Acá se acumulan los hallazgos de la auditoría
> proactiva de edge cases, sección por sección, más reciente arriba. No se
> vacía entre ciclos como `REPORTE_DE_CAMBIOS.md` — es el historial completo
> de todo lo auditado, para no repetir trabajo.

## Deudas / Clientes — auditado 01-09-2026

> Punto de partida: 20 escenarios hipotéticos de "día normal" para
> Deudas/Cuenta Corriente y Clientes, discutidos con Diego antes de leer
> código. Contrastados contra `src/modules/debts`, `src/modules/customers`,
> `src/modules/sales` (chequeo de límite de crédito),
> `src/modules/returns` (impacto de una devolución sobre una venta a
> crédito) y las rutas de `src/app/api/debts`, `src/app/api/debt-payments`,
> `src/app/api/customers` y `src/app/api/export`. El mismo criterio de
> siempre: la mejor práctica para un comercio real es que "cuánto me debe
> este cliente" sea SIEMPRE el mismo número en cualquier pantalla del
> sistema (POS, ficha del cliente, dashboard, backup), y que condonar o
> cobrar una deuda de un comercio nunca pueda tocar la deuda de otro.

### Bugs confirmados — ORDEN para el agente ejecutor (VS Code)

**DEUDA-FIX-01 (CRÍTICO) — Pago de deuda sin aislamiento por tenant**
- Archivo: `src/modules/debts/debt-payment-data-access.ts`, función
  `registerDebtPayment`.
- Qué pasa: exactamente el mismo bug que INV-FIX-01 (ya corregido en
  Inventario), pero acá con dinero de terceros. `transaction.debt.findUniqueOrThrow({ where: { id: validatedPayment.debtId } })`
  y `transaction.debt.updateMany({ where: { id: validatedPayment.debtId, remainingAmount: { gte: paymentAmount } } })`
  no filtran por `tenantId` en ningún momento. Un usuario de UN comercio
  puede registrar un pago contra el `debtId` de OTRO comercio (si lo
  conoce o lo adivina): el sistema le reduce el saldo a un cliente ajeno y
  le crea un `DebtPayment`/`CashMovement` con el `tenantId` del que pagó,
  mezclando la contabilidad de dos comercios distintos. El `tenantId`
  llega correcto desde `POST /api/debt-payments` (usa `requireRole` bien)
  — el bug está solo en la capa de datos, igual que en Inventario.
- Qué hacer: agregar `tenantId` a ambos `where`:
  `transaction.debt.findFirstOrThrow({ where: { id: validatedPayment.debtId, tenantId } })`
  y `transaction.debt.updateMany({ where: { id: validatedPayment.debtId, tenantId, remainingAmount: { gte: paymentAmount } } })`.
  Mismo patrón ya usado correctamente en `writeOffDebt` del mismo módulo
  (`where: { id, tenantId }`) — sólo hay que aplicarlo también acá.

**DEUDA-FIX-02 (ALTO) — Condonar una deuda no la saca de "deuda pendiente" en ningún otro lado**
- Archivo: `src/modules/debts/debt-data-access.ts`, función `writeOffDebt`;
  y todos los lugares que suman/filtran `remainingAmount` sin excluir
  `writtenOff: true`.
- Qué pasa: `writeOffDebt` pone `writtenOff: true` pero deja
  `remainingAmount` intacto (con el saldo que tenía antes de condonarla).
  El único lugar del código que filtra correctamente `writtenOff: false`
  al sumar deuda es el chequeo de límite de crédito en
  `sale-data-access.ts:251`. Todo lo demás NO filtra, así que una deuda
  condonada sigue apareciendo como "pendiente" en:
  `DELETE /api/customers/[id]` (línea 86, el guard que bloquea borrar un
  cliente con deuda — un cliente con la deuda YA condonada queda
  bloqueado para siempre, "No podés eliminar un cliente con deudas
  pendientes" sobre una deuda que ya se perdonó),
  `GET /api/export` (línea 32, el backup exporta la deuda condonada como
  si siguiera activa), y `dashboard-summary.ts` (línea 51, el total de
  "deuda pendiente" del dashboard suma también lo condonado). El único
  lugar donde SÍ se filtra a mano es el frontend de `debts-list.tsx`
  (`!d.writtenOff` repetido en varios puntos) — pero `customer-detail.tsx`,
  `customer-payment-form.tsx`, `customers-list.tsx` y
  `cash-register-close.tsx` tampoco lo filtran.
- Qué hacer: la mejor práctica acá es arreglarlo en la fuente, no parchar
  cada consumidor uno por uno (son al menos 8 lugares distintos). En
  `writeOffDebt`, además de `writtenOff: true`, poner
  `remainingAmount: new Prisma.Decimal(0)`. Así "cuánto debe" es
  automáticamente correcto en cualquier pantalla, reporte o backup que ya
  exista o que se agregue en el futuro, sin depender de que cada uno se
  acuerde de excluir `writtenOff`. El campo `writtenOff` queda igual para
  poder mostrar "Incobrable" en vez de "Pagada" en la UI (ya lo hace
  `debts-list.tsx`).

**DEUDA-FIX-03 (MEDIO) — Ni crear una deuda, ni pagarla, ni condonarla queda en el registro de auditoría**
- Archivos: `src/modules/debts/debt-data-access.ts` (`createDebt`,
  `writeOffDebt`), `src/modules/debts/debt-payment-data-access.ts`
  (`registerDebtPayment`).
- Qué pasa: no hay ningún `logAudit(...)` en todo el módulo. A diferencia
  de otras acciones financieras del sistema (cambios de precio de
  producto, devoluciones antes de RET-FIX-07), acá no queda ningún rastro
  de auditoría general de quién generó una deuda, quién cobró un pago, y
  sobre todo quién decidió condonarla — esta última es la más sensible de
  las tres, porque "perdonarle" una deuda a un cliente es una decisión
  económica que un dueño va a querer poder auditar más adelante.
- Qué hacer: agregar `void logAudit({ tenantId, userId, action: "DEBT_CREATED" | "DEBT_PAYMENT_REGISTERED" | "DEBT_WRITTEN_OFF", entityType: "Debt", entityId: debt.id, metadata: {...} })`
  en las tres rutas (`POST /api/debts`, `POST /api/debt-payments`,
  `PATCH /api/debts/[id]/write-off`), que ya tienen `userId` disponible vía
  `requireRole`, siguiendo el mismo patrón usado en
  `PRODUCT_PRICE_CHANGE`/`PRODUCT_UPDATED`.

**DEUDA-FIX-04 (BAJO-MEDIO) — Listados de deudas, pagos y clientes sin control de rol**
- Archivos: `src/app/api/debts/route.ts` (`GET`),
  `src/app/api/debt-payments/route.ts` (`GET`),
  `src/app/api/customers/route.ts` (`GET`).
- Qué pasa: mismo patrón sistémico ya encontrado y corregido en todas las
  secciones anteriores (POS, Devoluciones, Caja, Inventario): los tres
  `GET` usan solo `requireTenantId()` en vez de `requireRole(...)`, así
  que cualquier usuario autenticado del comercio puede ver el historial
  completo de deudas, pagos y clientes (incluyendo datos de contacto y
  límites de crédito) sin importar si su rol tiene acceso a la sección
  "customers".
- Qué hacer: cambiar los tres a
  `requireRole(["OWNER", "CASHIER", "SUPERVISOR"], "customers")`, el mismo
  set de roles que ya usan correctamente los `POST` de esas mismas rutas
  y `PUT /api/customers/[id]`.

**DEUDA-FIX-05 (MEDIO) — Cliente nuevo sin límite de crédito configurado queda con crédito ilimitado, sin ningún aviso**
- Archivos: `src/modules/customers/customer-validation.ts`,
  `src/modules/sales/sale-data-access.ts:249-255`.
- Qué pasa: `creditLimit` es `null` por defecto en un cliente nuevo (nunca
  se setea en `createCustomer`), y el chequeo de crédito en la venta
  (`if (customer.creditLimit !== null && ...)`) interpreta `null` como
  "sin límite", no como "límite cero". En la práctica: cualquier cajero
  puede cargar un cliente nuevo y venderle a crédito CUALQUIER monto, sin
  tope, sin que nadie lo note, porque el sistema nunca avisa que ese
  cliente "no tiene límite configurado" — se ve exactamente igual que un
  cliente con límite alto a propósito.
- Qué hacer: no bloquear la venta (puede ser una decisión real del dueño
  tener clientes de confianza sin tope), pero sí hacerlo visible: en el
  formulario de alta de cliente, dejar el campo de límite de crédito con
  un estado explícito "Sin límite (requiere aprobación)" en vez de vacío
  por omisión, y en el POS, cuando se selecciona un cliente con
  `creditLimit === null` para una venta a crédito, mostrar un aviso visible
  ("Este cliente no tiene límite de crédito configurado") en vez de dejarlo
  pasar en silencio como si fuera lo normal.

**DEUDA-FIX-06 (BAJO) — `customerCode` único a nivel global, mismo patrón que `productCode` (INV-FIX-06)**
- Archivo: `prisma/schema.prisma`, modelo `Customer` (línea con
  `customerCode String? @unique`).
- Qué pasa: mismo defecto de diseño que INV-FIX-06, pero acá el riesgo
  real es menor porque no existe ningún endpoint de importación masiva de
  clientes con código propio — `createCustomer` siempre usa
  `generateCode("CLI")` (secuencial, autogenerado), así que la colisión
  entre comercios no tiene forma de dispararse hoy. Lo dejo igual como
  bug de diseño para prolijidad y consistencia con el resto del schema
  (`Supplier` ya usa `@@unique([name, tenantId])` correctamente).
- Qué hacer: cambiar a `@@unique([tenantId, customerCode])` en el mismo
  commit/migración que INV-FIX-06 si todavía no se aplicó, o como
  follow-up de una línea si INV-FIX-06 ya se hizo — no urge por separado,
  se puede agrupar.

### Al terminar

1. `npm run lint && npm run typecheck && npm test` — todo debe pasar antes
   de commitear.
2. Commit + push con mensaje descriptivo (ej.
   `fix(debts): tenant isolation on debt payments, write-off zeroes balance, credit limit visibility`).
3. Agregar una entrada corta a `TAREAS/REPORTELIDER.md` — no es necesario
   redactarla en detalle, solo dejar constancia de qué se tocó.
4. Entregable breve acá mismo: archivos modificados, resultado de
   typecheck, hash de commit.
5. No te autocertifiques como "verificado" — eso lo revisa el Ingeniero
   Líder mirando el diff real.

### Verificado correcto (no ordenar fix)

1. `validateCreateDebtInput` y `validateRegisterDebtPaymentInput` exigen
   montos positivos (> 0) — no se puede crear una deuda ni registrar un
   pago con monto negativo o cero.
2. `registerDebtPayment` ya es concurrency-safe: `updateMany` con guard
   `remainingAmount: { gte: paymentAmount }` + reintento ante
   `P2028`/`P2034` (mismo patrón confirmado en Caja) — dos pagos
   simultáneos no pueden dejar el saldo en negativo.
3. `registerDebtPayment` exige caja abierta (`requireOpenCashRegisterSession`)
   cuando el método es "Efectivo", y ya captura el método real en
   `DebtPayment.method` (mismo patrón de CAJA-FIX-02, ya implementado acá
   desde el vamos, no hace falta ordenarlo de nuevo).
4. `DELETE /api/customers/[id]` bloquea el borrado si el cliente tiene
   deuda pendiente (antes de que exista DEUDA-FIX-02, esto incluye
   erróneamente deuda condonada — una vez aplicado DEUDA-FIX-02 este
   chequeo queda perfecto sin tocarlo).
5. `createDebt`, `listDebts`, `createCustomer`, `listCustomers`,
   `updateCustomer` están correctamente scopeados por `tenantId` — el bug
   de aislamiento de DEUDA-FIX-01 es puntual de
   `debt-payment-data-access.ts`, no un patrón general del módulo.
6. El chequeo de límite de crédito en la venta
   (`sale-data-access.ts:249-255`) ya suma solo deuda vigente
   (`writtenOff: false`) — el bug de DEUDA-FIX-02 es de los OTROS
   consumidores de `remainingAmount`, no de este chequeo.
7. Una devolución sobre una venta a crédito/mixta descuenta correctamente
   contra la deuda asociada (`returns/index.ts:346-356`), con piso en 0
   (`Prisma.Decimal.max`-equivalente vía `lessThan(0) ? 0 : newRemaining`)
   — no puede quedar un saldo negativo por una devolución.
8. `validateRegisterDebtPaymentInput` valida el método contra una lista
   cerrada (`DEBT_PAYMENT_METHODS`) y usa "Efectivo" como default
   razonable si no se especifica.

### Inconcluso (necesita reproducción en vivo o decisión de producto)

1. No hay ninguna validación ni aviso de clientes duplicados por
   teléfono/email/DNI (`taxId`) — se pueden cargar dos fichas de cliente
   con el mismo contacto sin que el sistema lo note. Pregunta de producto:
   ¿es aceptable (hogares que comparten teléfono, por ejemplo) o
   convendría al menos un aviso no bloqueante al cargar un dato que ya
   existe en otro cliente del mismo comercio?
2. Cuando un cliente tiene varias deudas abiertas a la vez, no llegué a
   confirmar en profundidad la lógica exacta de a cuál se aplica un pago
   nuevo (`customer-payment-form.tsx` tiene lógica de selección/orden en
   el frontend, pero el backend simplemente recibe un `debtId` puntual) —
   no parece haber ningún camino donde se pierda plata, pero si se decide
   más adelante permitir "pago genérico distribuido entre varias deudas"
   convendría revisarlo con más detalle en ese momento.
3. No existe ningún recargo o interés automático por mora en deudas
   vencidas — confirmado que no hay nada de esto en el código, pero es
   100% una decisión de producto (¿SOLVEN quiere ese feature o no?), no un
   bug.

---

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

### Bugs confirmados

> Orden ya entregada al agente ejecutor (INV-FIX-01 a 10) y removida de acá para que no se repita. Resultado real: ver commits + TAREAS/REPORTELIDER.md.

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
