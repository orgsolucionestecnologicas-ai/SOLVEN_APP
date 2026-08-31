# ÓRDENES DE TESTEO — SOLVEN

> Archivo de trabajo de INGENIERODETESTEO (ver `TAREAS/INGENIERODETESTEO.md`
> para el protocolo completo). Acá se acumulan los hallazgos de la auditoría
> proactiva de edge cases, sección por sección, más reciente arriba. No se
> vacía entre ciclos como `REPORTE_DE_CAMBIOS.md` — es el historial completo
> de todo lo auditado, para no repetir trabajo.

## Punto de Venta (POS) / Ventas — auditado 31-08-2026

> Punto de partida: lista de 20 escenarios hipotéticos de "día normal" (POS)
> discutida con Diego antes de leer código. Los 20 fueron contrastados contra
> `src/modules/sales`, `src/app/ui/pos.tsx`, `src/modules/quotes`,
> `src/modules/invoices`, `src/lib/tenant.ts`. Resultado abajo.

### Bugs confirmados — ORDEN para el agente ejecutor (VS Code)

> Los 4 hallazgos de abajo son una orden lista para ejecutar, no un reporte
> para discutir. Corregir cada uno donde se indica. Si al implementar un fix
> aparece una ambigüedad de producto real (no de código), parar ese ítem
> puntual y dejarlo anotado en el entregable — no improvisar una decisión de
> negocio. El resto se sigue ejecutando igual.

#### POS-FIX-01 — Los descuentos manuales del POS (por ítem y "descuento global") no llegan al backend

`src/app/ui/pos.tsx:842` (`cartNet = cartTotal - totalDiscount - manualDiscountTotal`) y `:845-851` (`globalDiscountAmount`, `cartGrandTotal`) calculan y muestran en pantalla (línea `2539`) un total ya descontado. El payload que se manda a `POST /api/sales` (`pos.tsx:1401-1424`) solo incluye `discountAmount: totalDiscount` (el de promociones) — el descuento manual por ítem (`item.discount`/`item.discountType`, calculado en `getLineFinalTotal`, `pos.tsx:1341-1347`) y `globalDiscountAmount` se mandan como campos sueltos que el backend nunca lee. `src/modules/sales/sale-validation.ts:1-16` confirma que `CreateSaleItemInput` no tiene `discount`/`discountType`, y `validateCreateSaleInput` solo extrae `productId`/`serviceId`/`quantity`. `sale-data-access.ts:438-462` (`buildProductSaleItem`/`buildServiceSaleItem`) calculan `total = product.salePrice * quantity`, precio de lista completo, sin descuento. El `netTotal` real (`sale-data-access.ts:152`) solo resta el `discountAmount` de promociones. Para venta `CASH`, `collectedNow` se fuerza `= netTotal` (línea ~156) sin mirar lo que el cajero cobró. Efecto: el cajero cobra el precio con descuento que ve en pantalla, pero el sistema registra `CashMovement` y el total de la venta al precio completo → faltante de caja al cierre que en realidad es este bug, y si se factura por ARCA, se factura de más ante AFIP.

**Qué hacer:** que `POST /api/sales` cobre y registre exactamente el mismo total que el POS le mostró al cliente. Extender `CreateSaleWithPromotionsInput`/`CreateSaleItemInput` para aceptar el descuento manual por ítem (`discount`/`discountType`) y el descuento global (`globalDiscountType`/`globalDiscountValue` o el monto ya calculado), validarlos en `sale-validation.ts`, y sumarlos al `discountAmount` real que usa `createSale` para calcular `netTotal` en `sale-data-access.ts`. Si en el camino se resuelve también POS-FIX-02 (recalcular descuentos server-side), este descuento manual debe quedar contemplado en esa misma recomputación, no como un número aparte sin tope: agregar un límite sensato (ej. no puede superar el `totalAmount` de la venta) para no reabrir el mismo problema de confiar ciegamente en el cliente.

#### POS-FIX-02 — `discountAmount` y `promotionIds` de la venta se toman literalmente del payload del cliente, sin recalcular contra las promociones reales

`src/modules/sales/sale-data-access.ts:113-118` (`discountAmount` = cualquier número ≥ 0 que mande el cliente) y `:313-321` (`promotionIds` se usan tal cual para crear `PromotionUsage`, sin verificar que existan, pertenezcan al tenant, estén vigentes/activas, ni que el monto declarado coincida con lo que esas promociones otorgarían). El único control es que el descuento no deje la venta en negativo (`collectedNow.gt(netTotal)`). El flujo normal del POS obtiene ese número de un preview real (`/api/promotions/apply`, que sí usa `promotion-engine.ts`), pero `POST /api/sales` no vuelve a pasar por ese motor al confirmar — viola la regla de `CLAUDE.md` sección 4 ("recalcular desde la base de datos, nunca confiar en el payload del cliente para montos"), mismo patrón que `FIX-08` corrigió para `/api/invoices`.

**Qué hacer:** en `createSale` (`sale-data-access.ts`), antes de calcular `netTotal`, recalcular el descuento real invocando `promotion-engine.ts` con los `promotionIds` recibidos y los ítems reales de la venta (no confiar en `saleInput.discountAmount`). Si algún `promotionId` no existe, no pertenece al tenant, o no está vigente/activa en el momento de la venta, excluirlo del cálculo (no rechazar toda la venta) y usar el monto que el motor realmente calcule, ignorando el que mandó el cliente.

#### POS-FIX-03 — `GET /api/sales` no tiene ningún control de rol

`src/app/api/sales/route.ts:29-33` usa solo `requireTenantId()`. El `POST` de la misma ruta exige `requireRole(["OWNER","CASHIER"], "pos")` (línea 62), respetando `RolePermission` para la sección `pos`, pero el `GET` deja pasar a cualquier rol autenticado del tenant — un usuario `INVENTORY` o `READONLY` sin acceso a POS puede leer igual el historial completo de ventas (montos, clientes, métodos de pago, folios) pegándole directo a la API.

**Qué hacer:** cambiar `GET /api/sales` para usar `requireRole([...], "pos")` con los mismos roles habilitados que el `POST` (o los que correspondan para solo-lectura, a definir según qué roles deban poder listar ventas), respetando el override de `RolePermission`. No tocar por ahora los mismos `GET` sin `requireRole` en `/api/customers`, `/api/debts`, `/api/products`, `/api/returns`, `/api/quotes`, `/api/promotions`, `/api/reports/export` — esos se ordenan cuando le toque el turno a esas secciones.

#### POS-FIX-04 — Confirmar una cotización no tiene protección atómica contra doble ejecución

`src/modules/quotes/quote-data-access.ts:236-239` — el chequeo `quote.status === "CONFIRMED"` se hace sobre un `getQuoteById` leído ANTES de abrir la transacción. El `tx.quote.update` que marca `CONFIRMED` (líneas 325-328) no tiene condición de estado en el `where` ni valida cuántas filas afectó. Dos requests casi simultáneos (doble click, reintento de red) pueden pasar ambos el chequeo antes de que cualquiera actualice el estado y generar dos `Sale` reales con dos movimientos de caja. El stock está protegido individualmente (`UPDATE ... WHERE stock >= quantity`, mismo patrón que `sale-data-access.ts:511`), así que solo frena la duplicación si no alcanza stock para las dos.

**Qué hacer:** en `confirmQuote`, cambiar el `tx.quote.update` para incluir `status: { not: "CONFIRMED" }` (o `status: "PENDING"`, según los estados válidos previos) en el `where`, capturar el resultado (Prisma `update` con `where` no único lanza si no matchea — usar `updateMany` y chequear `count`, o `update` con manejo del error de "no encontrado"), y si no afectó ninguna fila, abortar toda la transacción lanzando `QuoteAlreadyConfirmedError` antes de crear la venta y descontar stock. Mismo criterio defensivo que ya se usa para el stock de productos.

### Al terminar (aplica a los 4 fixes de arriba, POS-FIX-01 a 04)

1. Correr `npm run lint && npm run typecheck && npm test` — no commitear si algo falla.
2. Commit + push: `git add -A && git commit -m "fix: POS-FIX-01..04 — descuentos, promociones, permisos GET /api/sales, doble confirmación de cotización" && git push origin main`.
3. Agregar una entrada corta a `TAREAS/REPORTELIDER.md`: `### DD-MM-AAAA — POS-FIX-01..04: [título corto]` + 2-4 líneas de resumen.
4. Entregable breve: archivos modificados, resultado de `typecheck`, hash del commit. No autocalificar el trabajo como "verificado" — eso lo hace el Ingeniero Líder contra el diff real.

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
- "Anular/cancelar una venta ya impactada en caja y stock" — no existe esa función en `src/modules/sales` ni en la API (solo aparece nombrada en un test). La única forma de revertir una venta hoy es por Devoluciones, ya auditado por separado (ver entrada de Devoluciones abajo). No es un bug, es una función que no existe.

---

## Devoluciones — hallazgo suelto (previo al arranque formal por secciones), 31-08-2026

> Este hallazgo salió al pensar el ejemplo que dio Diego para justificar esta
> metodología, antes de que INGENIERODETESTEO existiera como rol formal. Se
> deja acá como primer registro del formato, ya migrado también a
> `PENDIENTES.md`.

### Bugs confirmados
- **Devolución sobre venta MIXED no reduce la `Debt` asociada** — `src/modules/returns/index.ts:317`. `processReturn` solo descuenta `Debt.remainingAmount` cuando `sale.paymentType === "CREDIT"`. Desde `FEATURE-01` una venta `MIXED` también tiene `Sale.debtId` por su porción fiada, pero la condición no la contempla — al devolver un producto de una venta mixta, la deuda del cliente no baja aunque devolvió mercadería. Fix: `(sale.paymentType === "CREDIT" || sale.paymentType === "MIXED") && sale.debtId`, misma lógica de "no bajar de 0" que ya existe en las líneas siguientes.

### Inconcluso (necesita reproducción en vivo o decisión de producto)
- **Reintegro no se valida contra el desglose original de pago dividido** — `processReturn` exige un único `refundMethod` para toda la devolución, sin mostrar ni validar contra `Sale.paymentDetails`. Puede ser una decisión de negocio válida (el comercio decide cómo reintegra) — confirmar con Diego si necesita cambiar.

---
