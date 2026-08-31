# ÓRDENES DE TESTEO — SOLVEN

> Archivo de trabajo de INGENIERODETESTEO (ver `TAREAS/INGENIERODETESTEO.md`
> para el protocolo completo). Acá se acumulan los hallazgos de la auditoría
> proactiva de edge cases, sección por sección, más reciente arriba. No se
> vacía entre ciclos como `REPORTE_DE_CAMBIOS.md` — es el historial completo
> de todo lo auditado, para no repetir trabajo.

## Devoluciones — auditado 31-08-2026

> Punto de partida: 20 escenarios hipotéticos de "día normal" para
> Devoluciones, discutidos con Diego antes de leer código (incluye
> re-verificar el hallazgo suelto de MIXED/Debt registrado antes de que
> INGENIERODETESTEO existiera como rol formal — esa entrada vieja se
> reemplaza por esta). Contrastados contra `src/modules/returns`,
> `src/app/api/returns`, y lo necesario de `sales`, `cash-register`,
> `invoices`/ARCA y `audit`.

### Bugs confirmados — ORDEN para el agente ejecutor (VS Code)

> Los 7 hallazgos de abajo son una orden lista para ejecutar, no un reporte
> para discutir. Corregir cada uno donde se indica. Si al implementar un fix
> aparece una ambigüedad de producto real (no de código), parar ese ítem
> puntual y dejarlo anotado en el entregable — no improvisar una decisión de
> negocio. El resto se sigue ejecutando igual.

#### RET-FIX-01 — Condición de carrera en la validación de "cantidad ya devuelta": se puede devolver de más y reponer stock de más

`src/modules/returns/index.ts:247-254` lee `existingReturnItems` y arma `alreadyReturnedByProductId` con un simple `findMany` dentro de la transacción; el chequeo de tope (`:258-273`) compara contra `saleItem.quantity`. A diferencia de la reducción de stock en `sale-data-access.ts:511` (`UPDATE "Product" ... WHERE stock >= quantity`, atómico en una sola sentencia SQL), acá no hay ningún guard atómico ni `SELECT ... FOR UPDATE`: bajo el nivel de aislamiento por defecto de Postgres (Read Committed), dos `processReturn` casi simultáneos sobre la misma venta/producto (doble click, reintento de red, dos sesiones) pueden leer ambos el mismo `alreadyReturnedByProductId` ANTES de que cualquiera cree su `ReturnItem`, pasar los dos el chequeo, y terminar devolviendo en conjunto más de lo que esa línea vendió — con la reposición de stock (`:277-300`) duplicada también.

**Qué hacer:** aplicar el mismo criterio defensivo que ya se usa para stock. Opción más simple: envolver la lectura+chequeo+escritura de `ReturnItem` en un nivel de aislamiento `Serializable` o `RepeatableRead` para esta transacción (`prisma.$transaction(..., { isolationLevel: "Serializable" })`) y manejar el error de conflicto de serialización reintentando o devolviendo un error claro; o agregar una constraint/consulta atómica equivalente al patrón `WHERE stock >= quantity` que impida commitear un `ReturnItem` que lleve la suma devuelta por encima de `saleItem.quantity`.

#### RET-FIX-02 — El reintegro se calcula al precio de lista completo, ignorando cualquier descuento de la venta original

`src/modules/returns/index.ts:302` — `returnTotal = returnTotal.plus(saleItem.unitPrice.mul(returnItem.quantity))`. `SaleItem.unitPrice`/`total` son siempre el precio de lista sin descontar (confirmado en `sale-data-access.ts:438-462`, `buildProductSaleItem`/`buildServiceSaleItem`); cualquier descuento de la venta (hoy: promociones vía `Sale.discountAmount`; después de POS-FIX-01/02: también el descuento manual) vive a nivel de la venta completa, no prorateado por ítem. Una devolución parcial de una venta con descuento reintegra de más — el cliente recibe más plata de la que efectivamente pagó por esa unidad.

**Qué hacer:** en `processReturn`, calcular el `returnTotal` proporcional al descuento real de la venta: `unitPrice efectivo = saleItem.unitPrice * (1 - sale.discountAmount / totalAmount de la venta)` (o el criterio equivalente que ya use `netTotal` en `sale-data-access.ts`), y usar ese precio neto por unidad en vez de `saleItem.unitPrice` a secas. Si POS-FIX-01 termina agregando un descuento manual separado del de promociones, este cálculo tiene que sumar ambos, no solo el de promociones.

#### RET-FIX-03 — Devolución sobre venta con pago MIXED no reduce la `Debt` asociada

`src/modules/returns/index.ts:317` — `if (sale.paymentType === "CREDIT" && sale.debtId)` solo contempla `CREDIT`. Una venta `MIXED` también tiene `Sale.debtId` por su porción fiada (desde `FEATURE-01`), pero la condición no la contempla — al devolver un producto de una venta mixta, la deuda del cliente no baja aunque devolvió mercadería. *(Reconfirmado — este bug ya estaba anotado antes de que existiera el rol formal; sigue sin corregirse en el código actual.)*

**Qué hacer:** cambiar la condición a `(sale.paymentType === "CREDIT" || sale.paymentType === "MIXED") && sale.debtId`, manteniendo la misma lógica de "no bajar de 0" que ya existe en las líneas siguientes (`:319-325`).

#### RET-FIX-04 — `GET /api/returns` no tiene ningún control de rol

`src/app/api/returns/route.ts:23-26` usa solo `requireTenantId()`. El `POST` de la misma ruta sí exige `requireRole(["OWNER","CASHIER"], "returns")` (línea 71), respetando `RolePermission` para la sección `returns`, pero el `GET` deja pasar a cualquier rol autenticado del tenant — mismo patrón ya corregido para `/api/sales` en POS-FIX-03.

**Qué hacer:** cambiar `GET /api/returns` para usar `requireRole([...], "returns")` con los mismos roles habilitados que el `POST` (o los que correspondan para solo-lectura), respetando el override de `RolePermission`.

#### RET-FIX-05 — `processReturn` no exige una sesión de caja abierta

A diferencia de `createSale` (`sale-data-access.ts:106-110`, lanza `SaleNoCashRegisterOpenError` sin sesión abierta), `src/modules/returns/index.ts` no verifica en ningún punto que haya una `CashRegisterSession` con `status: "OPEN"` antes de procesar la devolución. Un reintegro en efectivo (`:305-312`, crea `CashMovement` tipo `OUT`) puede quedar registrado sin ninguna sesión de caja abierta que lo capture — y como `closeSession` (`cash-register-data-access.ts:73-84`) agrega movimientos por `createdAt >= session.openedAt`, ese movimiento anterior a la apertura de la próxima sesión nunca se cuenta en ningún cierre: la plata sale (queda registrada) pero jamás se reconcilia contra un arqueo real.

**Qué hacer:** agregar el mismo chequeo que `createSale` — buscar una `CashRegisterSession` abierta para el tenant antes de crear el `CashMovement` de tipo `OUT`, y si no hay ninguna, lanzar un error equivalente a `SaleNoCashRegisterOpenError` (puede ser la misma clase, reutilizada). Si Diego decide que las devoluciones sin reintegro en efectivo (tarjeta/transferencia/etc.) no necesitan caja abierta, limitar el chequeo solo al caso `refundMethod === "Efectivo"`.

#### RET-FIX-06 — No existe forma de devolver la venta de un Servicio

`src/modules/returns/index.ts:5-9` — `ReturnItemInput` solo tiene `productId` (obligatorio), sin ningún campo `serviceId`. SOLVEN vende Servicios por POS (`Service`, con su propio `ivaRate`), pero el módulo de Devoluciones no tiene ninguna vía para reembolsar uno — ni la API ni la validación lo contemplan.

**Qué hacer:** extender `ReturnItemInput` para aceptar `serviceId` como alternativa a `productId` (mismo patrón que `ValidatedSaleItemInput` en `sale-validation.ts`), y ajustar `processReturn` para matchear contra `SaleItem.serviceId` cuando corresponda, calculando el reintegro igual que para productos pero sin tocar stock/`InventoryMovement` (los servicios no tienen stock). Si Diego confirma que devolver un servicio no es un caso de negocio real para SOLVEN, dejar esto anotado como decisión de producto en vez de implementarlo — no asumir.

#### RET-FIX-07 — Las devoluciones no quedan registradas en `AuditLog`

`POST /api/returns` (`src/app/api/returns/route.ts`) nunca llama a `logAudit`, a diferencia de `POST /api/sales` (`src/app/api/sales/route.ts:83`, acción `SALE_CREATED`). No queda ningún rastro de qué usuario procesó una devolución, sobre qué venta, ni por qué monto — un dato sensible para auditar plata que sale de la caja.

**Qué hacer:** agregar un `logAudit({ tenantId, userId, action: "RETURN_CREATED", entityType: "Return", entityId: result.returnId, metadata: { saleId, totalReturned, refundMethod } })` en el `POST` de `/api/returns`, mismo patrón que ya usa `/api/sales`. Va a hacer falta pasar `userId` desde `requireRole` (ya lo devuelve, solo hay que desestructurarlo).

### Al terminar (aplica a los 7 fixes de arriba, RET-FIX-01 a 07)

1. Correr `npm run lint && npm run typecheck && npm test` — no commitear si algo falla.
2. Commit + push: `git add -A && git commit -m "fix: RET-FIX-01..07 — devoluciones: carrera de cantidad, reintegro con descuento, deuda MIXED, permisos GET, caja abierta, servicios, auditoría" && git push origin main`.
3. Agregar una entrada corta a `TAREAS/REPORTELIDER.md`: `### DD-MM-AAAA — RET-FIX-01..07: [título corto]` + 2-4 líneas de resumen.
4. Entregable breve: archivos modificados, resultado de `typecheck`, hash del commit. No autocalificar el trabajo como "verificado" — eso lo hace el Ingeniero Líder contra el diff real.

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
