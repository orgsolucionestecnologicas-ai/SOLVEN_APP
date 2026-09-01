# ÓRDENES DE TESTEO — SOLVEN

> Archivo de trabajo de INGENIERODETESTEO (ver `TAREAS/INGENIERODETESTEO.md`
> para el protocolo completo). Acá se acumulan los hallazgos de la auditoría
> proactiva de edge cases, sección por sección, más reciente arriba. No se
> vacía entre ciclos como `REPORTE_DE_CAMBIOS.md` — es el historial completo
> de todo lo auditado, para no repetir trabajo.

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
