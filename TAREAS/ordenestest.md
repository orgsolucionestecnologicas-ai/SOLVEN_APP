# ÓRDENES DE TESTEO — SOLVEN

> Archivo de trabajo de INGENIERODETESTEO (ver `TAREAS/INGENIERODETESTEO.md`
> para el protocolo completo). Acá se acumulan los hallazgos de la auditoría
> proactiva de edge cases, sección por sección, más reciente arriba. No se
> vacía entre ciclos como `REPORTE_DE_CAMBIOS.md` — es el historial completo
> de todo lo auditado, para no repetir trabajo.

## Promociones — auditado 02-09-2026

> Diego pidió explícitamente máximo detalle en esta sección, "que todo
> coincida a pleno". Por eso la verificación cruzó CUATRO archivos a la
> vez línea por línea: `src/modules/promotions/promotion-engine.ts`
> (motor de cálculo), `promotion-validation.ts`, `promotion-data-access.ts`
> y los dos puntos donde el motor realmente se invoca con datos reales —
> `src/app/api/promotions/apply/route.ts` (preview del carrito en el POS)
> y `src/modules/sales/sale-data-access.ts:175` (el cálculo autoritativo
> al confirmar la venta) — más `src/modules/returns/index.ts` para
> confirmar qué pasa con una promoción usada cuando esa venta se
> devuelve. Cada hallazgo de abajo está anclado a archivo:línea exacta y,
> donde correspondía, a los DOS call-sites del motor a la vez (no alcanza
> con mirar uno solo, porque pueden divergir entre sí).

### Bugs confirmados — ORDEN para el agente ejecutor (VS Code)

**PROMO-FIX-01 (CRÍTICO) — Las promociones restringidas por segmento de cliente (VIP, Recurrente, Nuevo) no se aplican NUNCA, a nadie**
- Archivos: `src/app/api/promotions/apply/route.ts` (línea donde llama a
  `applyPromotionsToCart`), `src/modules/sales/sale-data-access.ts:175`.
- Qué pasa: `applyPromotionsToCart(cartItems, promotions, customerId?, customerSegment?)`
  tiene un 4º parámetro, `customerSegment`, que es justamente lo que el
  motor usa para decidir si una promoción restringida a un segmento
  aplica (`promotion-engine.ts`: `if (promotion.customerSegment && promotion.customerSegment !== "NINGUNO" && promotion.customerSegment !== customerSegment) continue;`).
  Los DOS ÚNICOS lugares del sistema que invocan esta función —el preview
  del carrito en el POS (`apply/route.ts`) Y el cálculo real al confirmar
  la venta (`sale-data-access.ts:175`)— llaman a
  `applyPromotionsToCart(cartItems, promotions, customerId)`, sin un
  cuarto argumento. `customerSegment` llega siempre `undefined`. Como el
  chequeo es `promotion.customerSegment !== customerSegment` y
  `customerSegment` nunca es otra cosa que `undefined`, CUALQUIER
  promoción con un segmento configurado (VIP, Recurrente, Nuevo) queda
  descartada para TODOS los clientes, incluido el cliente que sí
  califica. No es que un cliente que no debería recibirla la reciba: es
  que la promoción, tal cual está configurada hoy, jamás descuenta nada
  para nadie, sin ningún error visible — el dueño la ve "activa" en el
  listado, con fechas vigentes, y simplemente nunca se usa.
- Qué hacer: antes de llamar a `applyPromotionsToCart` en
  `sale-data-access.ts` (cuando hay `customerId`), traer el segmento real
  con una consulta liviana
  `const customer = customerId ? await transaction.customer.findFirst({ where: { id: customerId, tenantId }, select: { segment: true } }) : null;`
  y pasar `customer?.segment` como 4º argumento. En
  `apply/route.ts`, mismo criterio: si viene `body.customerId`, buscar el
  cliente (scopeado por `tenantId`) y pasar su `segment` al motor. Ojo:
  este fetch en `sale-data-access.ts` puede reusar el mismo `customer`
  que ya se carga más abajo (línea ~242) para el chequeo de límite de
  crédito en ventas a crédito — evaluar si conviene subir esa consulta
  más arriba en la función en vez de duplicarla.

**PROMO-FIX-02 (ALTO) — Dos promociones distintas y vigentes del mismo tipo compiten en silencio por el mismo producto, y el verificador de solapamiento no las detecta**
- Archivo: `src/modules/promotions/promotion-engine.ts` (todas las
  funciones `applyXPromotion`, vía `item.appliedTypes.has(type)` /
  `item.appliedTypes.add(type)`), `src/modules/promotions/promotion-data-access.ts`,
  función `findOverlappingPromotions`.
- Qué pasa: el motor bloquea que un mismo ítem del carrito reciba una
  segunda promoción del MISMO `PromotionType` (enum: PERCENTAGE,
  FIXED_AMOUNT, TWO_FOR_ONE, etc.) usando un `Set<PromotionType>` por
  ítem — no un `Set` de `promotion.id`. Si un comercio tiene, por
  ejemplo, "10% en Lácteos" (CATEGORY, tipo PERCENTAGE) Y "5% en todo el
  local" (ALL_PRODUCTS, tipo también PERCENTAGE) vigentes al mismo
  tiempo, un producto de Lácteos solo recibe la PRIMERA de las dos que el
  motor procese (según el orden en que llegan del array `promotions`, que
  no tiene ningún criterio explícito de prioridad) — la segunda, aunque
  100% válida y vigente, se descarta en silencio para ese ítem, sin
  ningún error, log ni aviso en ningún lado. Esto sería relativamente
  menor si el creador de la segunda promoción pudiera detectarlo al
  crearla, pero el verificador de solapamiento
  (`findOverlappingPromotions`, usado por `check-overlap/route.ts`) SOLO
  compara promociones con el mismo `application` EXACTO: dos `CATEGORY`
  de la misma categoría, o dos `SPECIFIC_PRODUCT` del mismo producto. NO
  detecta el cruce entre `ALL_PRODUCTS` y `CATEGORY`, ni entre `CATEGORY`
  y un `SPECIFIC_PRODUCT` que pertenece a esa categoría — que es
  exactamente el caso del ejemplo de arriba. Resultado real: el dueño
  crea la segunda promoción, el sistema le dice "no hay solapamiento", la
  guarda, y nunca sabrá por qué esa promoción "no vende" hasta que
  audite manualmente el ranking de uso.
- Qué hacer: dos cambios independientes, los dos hacen falta:
  1) En el motor, trackear por `promotion.id` en vez de por `type` si la
     intención real es "una promoción no puede tocar el mismo ítem dos
     veces a través de sí misma" — hoy ese chequeo por tipo no protege
     nada dentro de una misma promoción (cada ítem se visita una sola vez
     por promoción), así que en la práctica solo bloquea combinaciones
     ENTRE promociones distintas del mismo tipo, algo que no parece ser
     la intención real dado que el propio sistema tiene un verificador de
     solapamiento separado para prevenir conflictos. Confirmar con Diego
     si la política deseada es "combinar todas las promociones vigentes
     que apliquen" o "la primera promoción que toca un ítem gana, las
     demás no aplican a ese ítem" — y que el código refleje esa decisión
     de forma explícita y documentada, no como efecto secundario de un
     `Set<PromotionType>`.
  2) En `findOverlappingPromotions`, ampliar la detección de solapamiento
     para que compare TODAS las combinaciones de `application` que
     pueden tocar el mismo producto, no solo la misma `application`
     exacta: una promoción `ALL_PRODUCTS` solapa con cualquier `CATEGORY`
     o `SPECIFIC_PRODUCT` vigente en el mismo rango de fechas; una
     `CATEGORY` solapa con un `SPECIFIC_PRODUCT` vigente si ese producto
     pertenece a esa categoría (requiere consultar `Product.categoryName`
     del `productAId` en cuestión).

**PROMO-FIX-03 (ALTO) — Se puede crear una promoción "fantasma" que queda activa pero nunca descuenta nada**
- Archivos: `src/modules/promotions/promotion-validation.ts`, función
  `validateCreatePromotion`.
- Qué pasa: dos combinaciones inválidas pasan la validación sin ningún
  error y quedan guardadas como promoción activa, pero el motor nunca las
  aplica: (a) una promoción `type: SPECIAL_PRICE` con `application`
  distinto de `SPECIFIC_PRODUCT` (por ejemplo `CATEGORY` o
  `ALL_PRODUCTS`) — `applySpecialPricePromotion` en el motor exige
  `promotion.application === "SPECIFIC_PRODUCT"` como condición dura, sin
  excepción, así que cualquier otra combinación nunca hace nada; (b)
  cualquier promoción con `application: SPECIFIC_PRODUCT` sin
  `productAId` informado — la validación solo exige `categoryName`
  cuando `application === "CATEGORY"`, y solo exige `productAId` cuando
  `type === "BUNDLED_PRODUCTS"`, pero nunca exige `productAId` cuando
  `application === "SPECIFIC_PRODUCT"` con cualquier otro `type` — el
  motor compara `item.productId === promotion.productAId`, que con
  `productAId` vacío nunca coincide con nada.
- Qué hacer: agregar en `validateCreatePromotion` (y en
  `validateUpdatePromotion`, para que tampoco se pueda editar una
  promoción hacia un estado inválido): si `type === "SPECIAL_PRICE"`,
  exigir `application === "SPECIFIC_PRODUCT"` explícitamente (mismo
  criterio que ya se usa para bloquear combinaciones inválidas de
  `BUNDLED_PRODUCTS`); si `application === "SPECIFIC_PRODUCT"` (con
  cualquier `type`, no solo `SPECIAL_PRICE`), exigir `productAId` no
  vacío, con el mismo mensaje de error que ya usa `categoryName` para
  `CATEGORY`.

**PROMO-FIX-04 (MEDIO) — Fecha de vencimiento de una promoción interpretada en UTC, no en horario argentino**
- Archivo: `src/app/ui/promotions*.tsx` (el formulario de alta/edición de
  promoción, construcción de `startsAt`/`endsAt` antes de enviar al
  backend: `new Date(form.endsAt).toISOString()` a partir de una fecha
  simple del datepicker, sin offset).
- Qué pasa: mismo patrón de raíz que REPORTE-FIX-03 (reportes ARCA), acá
  aplicado a promociones. Si el dueño configura "vence el 2 de
  septiembre" en el formulario, `new Date("2026-09-02")` se interpreta
  como medianoche UTC de esa fecha — que en horario argentino (UTC-3) es
  las 21:00 del día ANTERIOR (1 de septiembre). La promoción deja de
  aplicarse casi un día entero antes de lo que cualquier dueño esperaría
  al leer "vence el 2/9". El mismo problema, en menor medida, corre para
  `startsAt` (arranca 3 horas antes de la medianoche local, lo cual es
  menos grave porque no le corta nada a nadie, pero es la misma causa
  raíz).
- Qué hacer: aplicar el offset fijo de Argentina al construir las fechas
  en el formulario, igual que se resolvió en REPORTE-FIX-03:
  `new Date(`${form.endsAt}T23:59:59.999-03:00`).toISOString()` para el
  fin (inclusive todo el día elegido) y
  `new Date(`${form.startsAt}T00:00:00-03:00`).toISOString()` para el
  inicio.

**PROMO-FIX-05 (MEDIO) — Una devolución no libera el uso consumido de una promoción**
- Archivo: `src/modules/returns/index.ts` (no hay ninguna referencia a
  `PromotionUsage` en todo el archivo).
- Qué pasa: si una venta que usó una promoción con tope ("1 uso por
  cliente" vía `maxUsagesPerCustomer`, o un tope global vía `maxUsages`)
  se devuelve por completo, el registro en `PromotionUsage` queda
  intacto. El cliente que devolvió su compra no puede volver a usar esa
  promoción nunca más, aunque su compra original haya quedado totalmente
  sin efecto — y si la promoción tenía un tope global de canjes, ese
  cupo queda gastado para siempre en una venta que ya no existe.
- Qué hacer: cuando `processReturn` procesa una devolución total de una
  venta que tiene `PromotionUsage` asociados (vía `sale.id` ==
  `PromotionUsage.saleId`), eliminar esos registros de `PromotionUsage`
  dentro de la misma transacción de la devolución. Si la devolución es
  PARCIAL (no se devuelven todos los ítems de la venta), es una decisión
  de producto más fina — lo más simple y seguro es limitar este fix a
  devoluciones totales por ahora, y dejar la devolución parcial con
  promoción como pregunta de producto (ver Inconcluso).

**PROMO-FIX-06 (BAJO-MEDIO) — Listado, historial de uso, ranking y "por vencer" de promociones sin control de rol**
- Archivos: `src/app/api/promotions/route.ts` (`GET`),
  `src/app/api/promotions/[id]/route.ts` (`GET`),
  `src/app/api/promotions/[id]/usages/route.ts` (`GET`),
  `src/app/api/promotions/ranking/route.ts` (`GET`),
  `src/app/api/promotions/expiring/route.ts` (`GET`).
- Qué pasa: los cinco usan solo `requireTenantId()`, mientras que
  `POST`, `PUT`, `DELETE` y `duplicate` de este mismo módulo ya son
  estrictamente `requireRole(["OWNER"])` — de hecho, promociones ya está
  documentado como sección "OWNER-only" desde QA-FIX-02. Estos cinco
  `GET` rompen esa consistencia: cualquier usuario autenticado del
  comercio puede ver el ranking de descuentos otorgados, el historial de
  uso por cliente y el detalle completo de cada promoción, sin importar
  su rol. (`POST /api/promotions/apply`, el preview del carrito en el
  POS, queda afuera de esta orden a propósito: ese sí necesita ser
  accesible para cualquier cajero, es el cálculo en vivo del descuento
  mientras arma la venta.)
- Qué hacer: cambiar los cinco `GET` a `requireRole(["OWNER"])`, mismo
  criterio que ya usa el resto del módulo.

**PROMO-FIX-07 (BAJO) — Sin registro de auditoría en todo el módulo de promociones**
- Archivo: `src/modules/promotions/promotion-data-access.ts`
  (`createPromotion`, `updatePromotion`, `deletePromotion`,
  `duplicatePromotion`).
- Qué pasa: no hay ningún `logAudit(...)` en todo el módulo. Mismo patrón
  ya encontrado y corregido en Devoluciones, Inventario, Deudas,
  Cotizaciones y Facturación — acá con el agravante de que una promoción
  mal configurada afecta directamente el margen de cada venta donde se
  aplica.
- Qué hacer: agregar `void logAudit({ tenantId, userId, action: "PROMOTION_CREATED" | "PROMOTION_UPDATED" | "PROMOTION_DELETED" | "PROMOTION_DUPLICATED", entityType: "Promotion", entityId: promotion.id, metadata: {...} })`
  en las cuatro rutas correspondientes, que ya tienen `userId` disponible
  vía `requireRole`.

### Al terminar

1. `npm run lint && npm run typecheck && npm test` — todo debe pasar antes
   de commitear. Prestar particular atención a `promotion-engine.test.ts`
   (ya existe una suite de 497 líneas): PROMO-FIX-01 y PROMO-FIX-02 tocan
   la firma y el comportamiento interno del motor, así que es muy
   probable que haya que sumar casos de test nuevos (segmento de cliente
   real que sí debe calificar, dos promociones del mismo tipo que sí
   deben poder combinarse) además de correr los existentes.
2. Commit + push con mensaje descriptivo (ej.
   `fix(promotions): segmento de cliente real, combinacion entre promos del mismo tipo, validacion de coherencia type/application`).
3. Agregar una entrada corta a `TAREAS/REPORTELIDER.md` — no es necesario
   redactarla en detalle, solo dejar constancia de qué se tocó.
4. Entregable breve acá mismo: archivos modificados, resultado de
   typecheck, hash de commit.
5. No te autocertifiques como "verificado" — eso lo revisa el Ingeniero
   Líder mirando el diff real. Dado el pedido explícito de Diego de
   máximo detalle en esta sección, el Ingeniero Líder debería en lo
   posible probar en vivo al menos un caso de PROMO-FIX-01 (una
   promoción VIP real, con un cliente VIP real) contra Neon, no solo
   confiar en los tests.

### Verificado correcto (no ordenar fix)

1. POS-FIX-02 sigue vigente en `sale-data-access.ts`: los `promotionIds`
   que manda el cliente se revalidan siempre contra promociones reales,
   activas y del tenant correcto (`where: { id: { in: promotionIds }, tenantId, isActive: true }`)
   antes de pasarlas al motor — un `promotionId` inventado, de otro
   tenant, o ya desactivado, no puede colarse desde el frontend.
2. El motor (`applyPromotionsToCart`) vuelve a chequear internamente
   vigencia de fechas (`isPromotionTimeValid`) y límites de uso
   (`isUsageWithinLimits`) para cada promoción, incluso las que ya
   vinieron filtradas por `isActive: true` desde la base — una promoción
   vencida o con el cupo agotado no puede aplicarse aunque el filtro de
   la consulta tuviera algún hueco.
3. El reparto de "gratis" en promociones `TWO_FOR_ONE`/`THREE_FOR_TWO` le
   da la unidad de MENOR precio al cliente gratis (orden ascendente por
   precio) — es el criterio estándar/esperado en un comercio argentino
   (el ítem más barato de los N llevados es el que sale gratis), no un
   bug aunque a primera vista podría parecer sospechoso que no sea el más
   caro.
4. `MINIMUM_PURCHASE` aplica su descuento sobre el subtotal completo del
   carrito sin restringirse por `application`/categoría — comportamiento
   esperado para este tipo de promoción, que por naturaleza es sobre el
   total de la compra, no sobre productos puntuales.
5. `deletePromotion` bloquea el borrado si la promoción ya tiene usos
   registrados (`PromotionHasUsagesError`) — mismo patrón correcto ya
   visto en Categorías; no se puede borrar una promoción con historial
   real, solo desactivarla.
6. `findOverlappingPromotions`/`check-overlap` sí detecta correctamente
   el caso más común y esperado: dos promociones con el mismo
   `application` EXACTO (misma categoría, o mismo producto específico) y
   fechas superpuestas. El gap real y confirmado es solo el cruce ENTRE
   distintos valores de `application` (cubierto en PROMO-FIX-02), no una
   ausencia total del verificador.
7. `POST /api/promotions/apply` usa correctamente solo `requireTenantId()`
   sin exigir rol de OWNER — a diferencia de los `GET` de PROMO-FIX-06,
   este sí necesita ser accesible para cualquier cajero, porque es el
   cálculo en vivo del descuento mientras arma una venta real en el POS.
8. Todos los cálculos del motor usan `Prisma.Decimal` de punta a punta
   (nunca `number`/`Math`), evitando el error de redondeo de punto
   flotante típico de JavaScript — buena práctica ya aplicada de forma
   consistente en todo `promotion-engine.ts`.

### Inconcluso (necesita reproducción en vivo o decisión de producto)

1. Cuál debería ser la política real de combinación entre promociones
   vigentes que se solapan (¿todas se combinan siempre? ¿gana la de
   mayor descuento para el cliente? ¿gana la más vieja/más nueva?) es una
   decisión de producto que PROMO-FIX-02 necesita para saber cómo
   reemplazar el `Set<PromotionType>` actual — dejé la recomendación
   técnica (trackear por `promotion.id`) pero la política de prioridad
   final la tiene que definir Diego.
2. Qué hacer con `PromotionUsage` en una devolución PARCIAL (no toda la
   venta, solo algunos ítems) de una venta que usó una promoción por
   cantidad (`TWO_FOR_ONE`/`THREE_FOR_TWO`) — PROMO-FIX-05 cubre el caso
   más simple y seguro (devolución total), pero el caso parcial requiere
   decidir si corresponde recalcular el descuento proporcionalmente o
   dejar el uso consumido como está. Queda pendiente de decisión de
   producto.
3. No encontré un caso concreto de descuadre de centavos en el
   prorrateo de `MINIMUM_PURCHASE` con `minimumPurchaseDiscountType: "FIXED_AMOUNT"`
   repartido entre ítems de precios muy dispares (la lógica usa
   `Prisma.Decimal` correctamente), pero tampoco hice una prueba
   exhaustiva de todas las combinaciones posibles de redondeo — lo dejo
   anotado por si en algún momento se reporta una diferencia real de
   centavos entre lo que muestra el ticket y lo que suma la caja.

---

## Reportes / Facturación (ARCA) — auditado 02-09-2026

> Punto de partida: 20 escenarios hipotéticos de "día normal" para
> Reportes y Facturación (ARCA/AFIP), discutidos con Diego antes de leer
> código. Contrastados contra `src/modules/invoices`, `src/lib/arca`
> completo (wsaa-client, wsfe-client, voucher-builder, token-cache,
> cert-crypto) y las rutas de `src/app/api/invoices` y
> `src/app/api/reports`. Punto de partida importante: FIX-08 (recalcular
> items/total de la venta real, nunca confiar en el cliente) sigue vigente
> y funcionando bien. Lo que encontramos ahora es distinto: no son bugs de
> "el cliente manda datos falsos", son bugs de concurrencia y de huso
> horario — plata real que AFIP ya cobró como comprobante pero que SOLVEN
> puede llegar a no tener registrada, y reportes que pueden mostrarle al
> dueño el día equivocado.

### Bugs confirmados

> Orden ya entregada al agente ejecutor (REPORTE-FIX-01 a 07) y removida de acá para que no se repita. Resultado real: ver commits + TAREAS/REPORTELIDER.md.

### Verificado correcto (no ordenar fix)

1. `emitInvoice` ya recalcula `items`/`total` desde la venta real cargada
   de la base (`sale.totalAmount`, `sale.items`) y nunca confía en datos
   que mande el cliente — FIX-08 sigue vigente y funcionando.
2. `emitInvoice` carga la venta con `where: { id: saleId, tenantId }` —
   aislamiento correcto por tenant para la venta que se factura (el gap de
   tenant de esta sección está sólo en `getInvoiceBySaleId`, que ni
   siquiera está conectada a una ruta).
3. `POST /api/invoices` y `GET /api/invoices/test` usan correctamente
   `requireRole` (`["OWNER", "CASHIER"]` y `["OWNER"]` respectivamente).
4. Ya existe un guard básico contra la doble factura (`findUnique` +
   restricción única de `saleId` en la base) — el problema de
   REPORTE-FIX-01 es específicamente la ventana entre ese chequeo y la
   llamada a AFIP, no la ausencia total de protección.
5. `ARCATokenCache` está correctamente scopeado por `tenantId` (clave
   única), no hay ningún riesgo de que el token de sesión de un comercio
   se use para facturar en nombre de otro.
6. `docTipo` se valida contra una lista cerrada (`[99, 96, 80]`) en
   `POST /api/invoices` antes de llegar a `emitInvoice`.
7. El ambiente de AFIP (homologación/producción) se lee de
   `TenantARCAConfig.ambiente` por comercio, con un fallback seguro a
   homologación si el valor guardado fuera inválido — ningún comercio
   puede terminar apuntando por accidente al ambiente de otro.

### Inconcluso (necesita reproducción en vivo o decisión de producto)

1. Sigue sin existir ninguna integración con Nota de Crédito de ARCA para
   las devoluciones (ya lo habíamos dejado anotado en la sección de
   Devoluciones) — una devolución de una venta facturada no genera ningún
   comprobante fiscal que la respalde ante AFIP, solo el registro interno
   de SOLVEN. Se reconfirma acá que sigue así. Pregunta de producto para
   Diego: ¿está dentro del alcance de SOLVEN emitir notas de crédito, o
   es una limitación conocida y aceptada por ahora?
2. `docNro` (CUIT/DNI) no tiene validación de formato/longitud en ningún
   lado del lado de SOLVEN — hoy AFIP lo rechaza igual (no es un bug
   silencioso, no se factura mal a nadie), pero el error que le llega al
   cajero es el mensaje crudo de AFIP en vez de algo como "el CUIT debe
   tener 11 dígitos". Es una mejora de UX, no un bug funcional; queda para
   una decisión de prioridad de Diego.
3. No existe ningún reporte de "ventas sin facturar" (comparar ventas del
   período contra facturas efectivamente emitidas) para que el dueño
   detecte huecos. Podría ser una feature útil dado que ARCA es opt-in y
   la facturación es una acción manual separada de la venta, pero es
   decisión de producto si vale la pena construirla.

---

## Cotizaciones — auditado 01-09-2026

> Punto de partida: 20 escenarios hipotéticos de "día normal" para
> Cotizaciones, discutidos con Diego antes de leer código. Contrastados
> contra `src/modules/quotes` completo y las rutas de
> `src/app/api/quotes` (incluidas `confirm`, `duplicate`, `send-reminder`,
> `expiring`) y `src/app/api/cron/expire-quotes`. El módulo ya viene con
> varios patrones bien resueltos de antes (POS-FIX-04: la confirmación de
> cotización ya es atómica y a prueba de doble clic/doble pestaña). Lo que
> encontramos ahora es más fino: confirmar una cotización arma una venta
> que, en varios sentidos, no se comporta igual que una venta hecha directo
> en el POS — cobra de más si había descuento, ignora cómo va a pagar
> realmente el cliente, y no exige caja abierta. La mejor práctica acá es
> que "cotización confirmada" y "venta de POS" terminen siendo la misma
> cosa por dentro, no dos caminos que casi coinciden.

### Bugs confirmados

> Orden ya entregada al agente ejecutor (COT-FIX-01 a 08) y removida de acá para que no se repita. Follow-up menor detectado durante la verificación (persistir el método de pago elegido en `paymentDetails` al confirmar) también resuelto y verificado. Resultado real: ver commits + TAREAS/REPORTELIDER.md.

### Verificado correcto (no ordenar fix)

1. `confirmQuote` ya reduce el stock de forma atómica (`UPDATE ... WHERE stock >= quantity RETURNING ...`,
   mismo patrón que `sale-data-access.ts`) y ya evita la doble confirmación
   por carrera (`updateMany` con guard `status: { not: "CONFIRMED" }` +
   chequeo de `count`) — POS-FIX-04 sigue funcionando correctamente acá.
2. El precio, IVA y nombre de cada ítem quedan "congelados" en `QuoteItem`
   al crear la cotización, y se usan tal cual al confirmar — una
   cotización siempre respeta el precio que se le mostró al cliente, sin
   importar que el producto haya cambiado de precio mientras tanto
   (comportamiento de negocio esperado, no un bug).
3. `validateCreateQuoteInput` exige cantidad entera positiva en cada
   ítem, exige cliente (por id o por nombre libre) y valida el formato del
   email si se informa.
4. Todos los queries de `createQuote`, `getQuoteById`, `listQuotes`,
   `cancelQuote`, `duplicateQuote` y la parte de stock/producto de
   `confirmQuote` están correctamente scopeados por `tenantId` — a
   diferencia de Inventario y Deudas, este módulo no repite el patrón de
   aislamiento roto (la única falla real de `confirmQuote` es de negocio,
   no de aislamiento entre comercios).
5. No se puede confirmar una cotización vencida (`QuoteExpiredError`) ni
   una ya cancelada/expirada, y el vencimiento se resuelve de forma
   perezosa tanto al listar como al leer una cotización individual.
6. No se puede cancelar una cotización ya confirmada
   (`QuoteAlreadyConfirmedError`).
7. El cron `GET /api/cron/expire-quotes` está protegido por
   `CRON_SECRET` y no tiene el riesgo de aislamiento que sí tuvo el cron
   de gastos recurrentes (visto en Caja), porque acá no hay ningún efecto
   secundario por tenant (solo cambia `status`, una sola operación atómica
   sobre todos los comercios a la vez, sin caja ni email de por medio).

### Inconcluso (necesita reproducción en vivo o decisión de producto)

1. El stock reservado por cotizaciones pendientes sigue siendo puramente
   informativo (ya lo dejamos anotado en Inventario,
   `getReservedStockByProduct`) — dos cotizaciones abiertas pueden seguir
   prometiendo el mismo último producto; sigue siendo una decisión de
   producto, no algo nuevo de esta sección.
2. Dos ítems del mismo producto en la misma cotización no se fusionan en
   una sola línea (a diferencia del carrito del POS, que sí mergea por
   `productId`) — no genera ningún cálculo incorrecto, solo aparecen como
   dos líneas separadas. Bajo impacto, lo dejo anotado por si en algún
   momento se decide unificar el comportamiento con el POS.
3. `quoteNumber` es único a nivel global igual que `productCode`
   (INV-FIX-06) y `customerCode` (DEUDA-FIX-06), pero acá tampoco hay
   ningún camino de importación con número propio — siempre es
   autogenerado por `generateCode("COT")`, así que no hay forma práctica
   de que colisione hoy. Se puede agrupar con esas dos migraciones si en
   algún momento se decide encarar todos los `@unique` globales del schema
   de una sola vez.

---

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

### Bugs confirmados

> Orden ya entregada al agente ejecutor (DEUDA-FIX-01 a 06) y removida de acá para que no se repita. Resultado real: ver commits + TAREAS/REPORTELIDER.md.

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
