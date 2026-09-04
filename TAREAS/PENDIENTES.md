# PENDIENTES — SOLVEN

> Backlog vivo de cosas por decidir o hacer que no son una orden ejecutable todavía (o que están a la espera de una confirmación de Diego). A diferencia de `REPORTELIDER.md` (historial de lo ya hecho) y las órdenes de `TAREAS/*.md` (trabajo activo para el agente), este archivo es para anotar pendientes sueltos a medida que aparecen, para no perderlos.
>
> **2026-07-18: migración completa desde Notion.** Se revisaron las ~50 tareas de la base "SOLVEN — Gestión de Tareas" en Notion. Varias que figuraban como "⏳ Pendiente" ya estaban resueltas en el código (verificado línea por línea, no solo por el texto de Notion) — esas se archivaron como cerradas más abajo. Las genuinamente abiertas quedaron acá, ordenadas por urgencia. Las que dependen de una app o integración externa (Rebill, ARCA, Resend, Cloudflare) van en su propia sección al final, porque no son algo que el agente de código pueda resolver solo. **De acá en adelante este archivo es la única fuente de pendientes — ya no se usa Notion para esto.**
>
> **2026-09-04: reconciliado entre `main` y `design/revision-uiux-sep-2026`.** Mientras la rama de diseño estuvo activa, este archivo se editó por separado en cada rama y divergió — `main` tenía hallazgos (incluido `SALE-TENANT-SCOPE`, 🔴 Crítico) invisibles desde la rama de diseño, y viceversa. Reconciliado a mano una sola vez; ver protocolo para no repetirlo en `TAREAS/INGENIERO_LIDER.md` → "Cuándo hay una rama activa además de `main`".
>
> Formato: cada ítem con fecha en que se anotó, contexto breve, y qué haría falta para poder cerrarlo o convertirlo en una orden. Desde esta reconciliación, cada ítem también lleva una etiqueta de qué tipo de trabajo es:
> - 🔧 **CÓDIGO** — se puede convertir directo en una orden para el agente ejecutor (o el Ingeniero Líder lo resuelve directo si es chico).
> - 🤔 **DECISIÓN** — necesita que Diego resuelva algo de producto/negocio antes de poder escribir una orden.
> - 🔍 **VERIFICAR** — necesita una sesión manual/QA en producción o reproducción en vivo, no alcanza con leer código.
> - 🛠️ **ACCIÓN MANUAL** — algo que solo Diego puede hacer (credenciales, paneles de terceros, decisiones ya tomadas que faltan ejecutar a mano).

---

## Resumen rápido

| Prioridad | Abiertos | De qué tipo |
|---|---|---|
| 🔴 Crítico | 4 | 1 código (`SALE-TENANT-SCOPE`), 3 acción manual (credenciales) |
| 🟠 Alto | 13 | 2 código, 4 decisión, 5 verificar, 2 acción manual/mixto |
| 🟡 Medio | 15 + hallazgos menores agrupados | mayormente decisión/verificar, ninguno urgente |
| Integraciones externas | 8 | dependen de acceso manual de Diego a paneles de terceros |

El único ítem 🔴 con código propio pendiente es `SALE-TENANT-SCOPE` — léelo primero si estás retomando el proyecto.

---

## Abiertos (ordenados por urgencia)

### 🔴 Crítico

#### 🛠️ T3 — Rotar token de GitHub expuesto
Manual, no verificable desde este entorno (sandbox sin credenciales de git). `github.com/settings/tokens` → revocar el token actual → generar uno nuevo con permisos `repo` → actualizar donde se use. ~30 min.

#### 🛠️ T5 — Configurar GitHub SSH (eliminar dependencia de token manual)
Manual, no verificable desde acá. `ssh-keygen -t ed25519` → agregar clave pública en GitHub → `git remote set-url origin git@github.com:...` → verificar con `git push`. ~45 min. Relacionado con T3: una vez con SSH, el token deja de ser necesario para push diario.

#### 🛠️ T2 (reformulado) — Confirmar rotación de `SOLVEN_SESSION_SECRET` y password de Neon
La tarea original de Notion pedía rotar `SOLVEN_PASSWORD` y `SOLVEN_SESSION_SECRET`. La parte de `SOLVEN_PASSWORD` ya se resolvió — no por rotación, sino porque se confirmó que era una variable vestigial sin uso y se borró de Vercel (ver sección Cerrados). Queda sin verificar: si `SOLVEN_SESSION_SECRET` en Vercel es un valor aleatorio seguro (mínimo 32 caracteres) y si la password de la base en Neon fue rotada después de la exposición original documentada en la tarjeta "🔐 Rotar credenciales expuestas en producción" (Notion la marcaba "Completada" pero sus propias notas listaban 4 pasos manuales pendientes para Diego, incluyendo este). No se puede verificar desde el código — requiere confirmación manual.

#### 🔧 SALE-TENANT-SCOPE — `createSale` no filtra productos por tenant y descuenta stock ajeno
Encontrado en el TEST COMPLETO de regresión (03-09-2026, `TAREAS/TEST_COMPLETO_SEP2026.md`). `createSale` (`src/modules/sales/sale-data-access.ts:133-134`) hace `transaction.product.findMany({ where: { id: { in: productIds } } })` y el service equivalente **sin `tenantId`**; el descuento de stock `reduceProductStock` (`:592-597`) es un UPDATE crudo `WHERE "id" = ... AND "stock" >= ...` también **sin `tenantId`**. No hay validación previa de pertenencia (`validateCreateSaleInput` es formato puro). Un usuario autenticado del tenant A que conozca un `id` de producto/servicio del tenant B puede leer su precio/`ivaRate` y **descontar stock del tenant B**. Misma clase que `INV-FIX-01` (el más crítico de su ciclo), pero en el camino de venta, nunca auditado para este punto (POS-FIX-01..04 se enfocó en descuentos y rol del GET). El análogo `createQuote` **sí** scopea por tenant (`quote-data-access.ts:58`), lo que confirma que es una omisión, no una decisión.

Exploitabilidad acotada: requiere un CUID ajeno (no enumerable), sin pérdida de dinero, daño limitado al contador de stock del tenant víctima (corregible) → **no obliga a frenar producción hoy, pero es el ítem #1 de la próxima orden de código.** Fix: `tenantId` en el `findMany` de productos/servicios (`:133-134`) + `AND "tenantId" = ${tenantId}` en el UPDATE de `reduceProductStock` (`:595`) + test de integración de aislamiento (venta del tenant A con producto del tenant B → `SaleProductNotFoundError`, stock del B intacto). Al tocarlo, agregar también `tenantId` al UPDATE crudo de stock de `confirmQuote` (`quote-data-access.ts`, hoy seguro por construcción porque los ítems de la cotización ya son del tenant, pero conviene por consistencia — defensa en profundidad).

### 🟠 Alto

#### 🔍 QA-CHROME-01-b — Promoción automática: necesita reproducción en vivo, no solo lectura de código
Verificado por el Ingeniero Líder (30-08-2026): el `useEffect` de `pos.tsx` (con debounce de 400ms) aplica promos automáticas sin depender del panel de Promociones — el código parece correcto. No se puede confirmar ni descartar el bug solo leyendo código. Antes de ordenar un fix, reproducir en vivo (agregar producto con promo automática activa, cronometrar si el descuento aparece solo). El otro hallazgo "Alto" (Cotización no limpia email/teléfono) sí se confirmó y pasó a `FIX-16`.

#### 🛠️ T18 — Smoke test manual completo en producción
Flujo completo de venta (contado, crédito), inventario y promociones, probado a mano en producción (https://solven-app-484v.vercel.app). Anotar cualquier error encontrado. Sesión manual de Diego, no orden de código. ~55 min.
**Por qué importa:** los tests automatizados (TESTS-01, FIX-10/11/12) cubren lógica unitaria, pero nadie recorrió el flujo end-to-end en producción real todavía.

#### 🛠️ T8 — Probar devoluciones completas en producción
Venta → devolución parcial → verificar que el stock sube y la caja refleja la diferencia. Sesión manual, no orden de código. ~55 min.
**Por qué importa:** con FIX-07 (selector de método de reintegro) ya en producción, conviene verificar también que el método elegido se refleje bien en caja.

#### 🛠️ T19 — Probar PROMO-FIX-01/05 en vivo (segmento de cliente + liberación de cupo en devolución total)
Verificado por el Ingeniero Líder (02-09-2026) sólo por lectura de código — el cableado del segmento (`sale-data-access.ts`/`apply/route.ts`) y la liberación de `PromotionUsage` en devolución total (`returns/index.ts`) quedaron sin test automatizado. Sesión manual: crear un cliente de segmento VIP (o Recurrente/Nuevo), una promoción restringida a ese segmento, vender con ese cliente y confirmar que el descuento se aplica; después hacer una devolución total de una venta con promoción de cupo limitado y confirmar que el cupo se libera (`PromotionUsage` de esa venta desaparece). ~20 min.
**Por qué importa:** PROMO-FIX-01 era el hallazgo CRÍTICO del ciclo (promos de segmento nunca se aplicaban) — la lógica del motor ya tiene tests genuinos, pero el cableado real contra la base de producción todavía no se probó en vivo.

#### 🤔 T20 — Decisión de producto: ¿2 minutos es el TTL correcto para revalidar una sesión desactivada?
`requireRole` (USER-FIX-03, 02-09-2026) revalida contra la DB si el usuario sigue activo/con el mismo rol, cacheado 2 minutos por `userId` para no pegarle a la base en cada request. En la práctica: un empleado que el OWNER desactiva puede seguir operando con su sesión ya abierta hasta 2 minutos más. La orden original sugería un rango de 2-3 min como razonable para un POS (no banca), y el valor implementado cae ahí, pero es una decisión de negocio, no algo que el código deba decidir solo. Si 2 minutos es demasiado (o muy poco), es un solo número para ajustar en `src/lib/tenant.ts` (`SESSION_REVALIDATE_TTL_MS`).

#### 🤔 T21 — Decisión de producto: ¿"Marca" (`brand`) merece una columna real en `Product`?
Anotado durante PROD-UX-01 (02-09-2026, rediseño del formulario de producto). El formulario captura `brand` en pantalla, pero `Product` no tiene ninguna columna para persistirlo — hoy se descarta en silencio al guardar, igual que pasaba antes con `barcode`/`sku` (ya corregidos en esa misma orden). No implementado a propósito, por instrucción explícita de la orden: es una decisión de producto (¿vale la pena para el catálogo de SOLVEN?), no algo que el agente deba resolver solo. Si Diego confirma que sí, es un cambio chico y ya mapeado: columna nueva `Product.brand String?` + wirear el campo ya existente en `src/app/ui/product-form.tsx` (captura y muestra, pero no lo manda en el `payload`).

#### 🤔 ARCA-MENSUAL-01 — Paquete mensual de facturas ARCA para el contador (diferencial estratégico de SOLVEN)
Anotado por Diego el 02-09-2026, al cierre de la sesión de revisión de diseño UI/UX. Cita textual de la idea: que a fin de mes SOLVEN pueda "adjuntar las facturas fiscales de ARCA, enumeradas y en orden" para que el dueño se las pueda mandar directo al contador — y que esto sea explícitamente **la diferencia entre SOLVEN y los otros sistemas de gestión**, no una feature más. No es un pedido de ejecución inmediata — queda para scoping y una orden futura, dedicada.

Contexto técnico relevante ya confirmado por lectura de código: `src/lib/arca` ya implementa WSAA+WSFE real (no es una feature nueva de cero, es una extensión de algo que ya funciona en producción). `Invoice` (`prisma/schema.prisma`) ya guarda `cae`/`caeFchVto`/`voucherNumber`/`voucherType` por venta — la data cruda para armar el paquete ya existe. Lo que falta es la capa de agregación: un endpoint/pantalla que junte todas las facturas emitidas de un período (mes calendario, probablemente con opción de rango custom), las ordene por número de comprobante, y las empaquete en un solo entregable — lo más probable es un PDF consolidado (portada + facturas numeradas en orden) o un ZIP de PDFs individuales ya prolijos, más un resumen/planilla (CSV o Excel) con folio, fecha, CAE, tipo de comprobante y monto por fila, para que el contador pueda cargarlo directo sin transcribir a mano.

No confirmado todavía y a definir cuando se escriba la orden: (a) ¿el entregable es un único PDF con todas las facturas, un ZIP, o ambos (paquete + planilla resumen)? (b) ¿hace falta generar por primera vez un PDF con el formato real de "factura A/B/C" tal como la vería el cliente (hoy no existe ningún PDF de factura individual — ver hallazgo de `CAJA-UX-01`, sección de auditoría de PDFs, que confirmó que no hay ningún archivo `invoice-pdf`/`factura-pdf` en el codebase) o alcanza con una planilla de datos sin el diseño de comprobante? (c) ¿se dispara manual (botón "Descargar paquete de [mes]") o también se puede programar/enviar por mail automáticamente a fin de mes (tocaría Resend, ya integrado para otros envíos)? Relacionado con `ARCA-NC-01` (Notas de Crédito) de abajo — si ese gap se cierra primero, el paquete mensual debería incluir también las Notas de Crédito emitidas, no solo facturas.

#### 🔧 ARCA-NC-01 — Sin Nota de Crédito AFIP para devoluciones de ventas ya facturadas (ORDEN ESCRITA — pendiente de ejecución)
Anotado por INGENIERODETESTEO al auditar Devoluciones (31-08-2026), reconfirmado al auditar Reportes/ARCA. Solo existe `src/app/ui/return-credit-note-pdf.tsx`, un comprobante interno impreso — ninguna llamada real a `src/lib/arca`/WSFE para emitir una Nota de Crédito fiscal.

Diego decidió el enfoque el 04-09-2026 tras una discusión sobre cómo resolver un canje con medios de pago mixtos: (1) un cambio de producto sigue siendo devolución + venta nueva como dos operaciones manuales, no se unifica; (2) la NC se emite sola, en el momento de la devolución, sin acción manual del cajero. Investigado cómo lo resuelve un software de gestión profesional / AFIP: la NC va solo por el ítem devuelto (no por la factura completa), referenciando la factura original vía `CbteAsoc` (obligatorio desde RG 4540/19), con los mismos datos de receptor que la factura original.

Orden ya escrita: `TAREAS/ARCA-NC-01_nota-de-credito-automatica.md` (rama `main`, no toca `design/revision-uiux-sep-2026`). Reutiliza el modelo `Invoice` existente (agrega `kind`, `returnId`, `cbteAsocTipo/PtoVta/Nro`) en vez de crear un modelo nuevo, y reutiliza el prorrateo que ya calcula `processReturn` (`proratedUnitPrice`) para que el monto de la NC coincida exactamente con `Return.totalAmount`. Punto abierto marcado explícitamente en la orden: los códigos numéricos de tipo de comprobante para NC (3=NC A, 8=NC B, 13=NC C) están tomados de conocimiento general, no de la tabla oficial de AFIP — hay que verificarlos antes de habilitar en ambiente "prod".

#### 🤔 USER-RATELIMIT — Rate limiting de login en memoria no escala a múltiples instancias serverless
El `Map` en memoria de `src/middleware.ts` que limita `/api/auth/login` (10/min) vive por instancia de función — en Vercel, con múltiples instancias concurrentes, el límite real efectivo es mayor al declarado (cada instancia cuenta aparte). No es una vulnerabilidad nueva (ya existía), solo quedó reconfirmado durante USER-FIX. Requiere decisión de infraestructura (ej. mover el contador a una store compartida) si se considera prioritario antes de tener volumen real de tráfico.

#### 🤔 DEUDA-DUP — Sin detección de cliente duplicado por teléfono/email/CUIT
Anotado por INGENIERODETESTEO al auditar Deudas/Clientes (31-08-2026). Se puede crear un `Customer` nuevo con el mismo teléfono/email/CUIT que uno existente, fragmentando el historial de deuda de una misma persona en dos registros. No es un bug de plata, es una decisión de producto (¿bloquear, avisar, o dejar como está?).

#### 🔍 DEUDA-PAGO-MULTI — Lógica de a qué deuda se aplica un pago cuando el cliente tiene varias abiertas, no verificada a fondo
Anotado por INGENIERODETESTEO. No se encontró ningún camino de pérdida de dinero al leer el código, pero tampoco se verificó en profundidad cuál de las deudas abiertas de un mismo cliente recibe el pago cuando hay más de una. Requiere una pasada dedicada si se prioriza (no es urgente, no hay riesgo de plata identificado).

#### 🤔 CAJA-BREAKDOWN — Desglose de denominación no se valida contra el monto declarado
Anotado por INGENIERODETESTEO al auditar Caja (31-08-2026). `openingBreakdown`/`closingBreakdown` se guardan como JSON libre sin validar que la suma de billetes/monedas coincida con `openingAmount`/`closingAmount`. Puede ser intencional (el desglose es solo referencia visual para quien cuenta el cajón, no una fuente de verdad) — confirmar con Diego si vale la pena validarlo o si arruinaría la flexibilidad de cargarlo.

#### 🔍 CAJA-TURNO — Cambio de turno sin cerrar caja, sin aviso al cajero entrante
Anotado por INGENIERODETESTEO. `cashierName` es texto libre, no una relación a `User`, así que no se pudo determinar leyendo el backend si el cajero entrante ve alguna advertencia de que la sesión abierta es de otra persona. Requiere revisión de la UI en vivo (`app-shell.tsx` / pantalla de apertura de caja).

#### 🔧 TEST-FLAKY-STOCK-ADJ — `stock-adjustment.integration.test.ts` falla siempre por una condición de carrera en el propio test, no en la app
Visto de forma independiente 3 veces (PROD-UX-01, CAJA-UX-01, y verificado por mí mismo corriendo el archivo aislado el 02-09-2026) — nunca es un efecto de lo que se estaba ordenando en esos ciclos, `src/modules/inventory/*` está fuera de alcance de ambas órdenes. Causa raíz confirmada por lectura de código: `adjustProductStock` (`src/modules/inventory/stock-adjustment.ts:74`) hace `void logAudit({...})` sin `await` — el `afterAll`/próximo `beforeEach` puede correr `deleteStockAdjustmentTestData()` (que borra `AuditLog` por `entityId` de producto, después `Product`, después `User`) antes de que ese `INSERT` de auditoría termine; si el insert llega tarde, deja una fila de `AuditLog` con `userId` apuntando a un `User` que el mismo cleanup está por borrar → `Foreign key constraint violated: AuditLog_userId_fkey`. Fix de una línea cuando alguien tenga autorización para tocar `src/modules/inventory/*`: `await logAudit(...)` en vez de `void logAudit(...)`, línea 74. Bajo riesgo, no bloquea nada — solo hace ruido en cada corrida completa de `npm test`.

### 🟡 Medio

#### 🔧 INV-ADJ-IVA-FIJO — Preview de impuesto en alta de inventario hardcodeado a 21%
Encontrado en el TEST COMPLETO de regresión (03-09-2026). `src/app/ui/inventory-adjust-form.tsx:247` calcula `const impuestos = costoTotal * 0.21;` (mostrado como "Impuesto (IVA 21%)", `:731`). Es solo un preview informativo del valor del stock que se está cargando — no persiste ni afecta ninguna venta/factura — pero ignora el `ivaRate` real por producto (puede ser 0 / 10.5 / 27%). Cosmético, sin riesgo financiero. Fix chico si se prioriza: calcular el impuesto por línea con el `ivaRate` real de cada producto en vez del 21% fijo.

#### 🔧 PROD-FORM-RO — `ProductForm` sin modo de solo lectura consciente del rol del viewer
Confirmado al ejecutar POS-UX-02 (04-09-2026): un rol `CASHIER` ya puede llegar hoy a `ProductEditView` (`src/app/products/[id]/product-edit-view.tsx`) tanto desde el menú "Productos" (`src/app/ui/app-shell.tsx` no tiene `hiddenForRoles` en ese ítem) como, desde POS-UX-02, desde la cápsula "Detalle" de cada tarjeta en el POS. `src/app/products/[id]/page.tsx` no aplica ningún `requireRole`, y `ProductForm` renderiza el formulario de edición completo sin importar el rol — solo el `PUT` del lado servidor está bloqueado a `OWNER`/`INVENTORY`, así que un `CASHIER` puede editar todos los campos en pantalla y recién falla al guardar. No es un bug nuevo, pero POS-UX-02 le agregó una segunda vía de acceso más frecuente al mismo problema preexistente. Arreglo: modo de solo lectura en `ProductForm` según rol del viewer.

#### 🤔 [Devoluciones · UX] Mostrar detalle completo de la venta original antes de confirmar
Mejora de UX en el flujo de devoluciones. Sin archivos específicos anotados en Notion.

#### 🤔 [POS · UX] Botón "Cobrar" mostrando el monto en el mismo botón (ej: "Cobrar $4.250")
Mejora de UX en POS.

#### 🤔 [Productos] Generación e impresión de etiqueta con código de barras desde SOLVEN
Feature nueva, sin archivos específicos anotados.

#### 🤔 [Productos · UX] Subir foto de producto con drag-and-drop o captura desde cámara
Notion la marca "🚫 Bloqueada" sin especificar por qué. Confirmar con Diego cuál era el bloqueo antes de retomarla.

#### 🤔 [Cotizaciones · UX] Indicador urgente (rojo) si la cotización vence en menos de 3 días
Notion la marca "🚫 Bloqueada" sin especificar por qué. Confirmar con Diego cuál era el bloqueo antes de retomarla.

#### 🤔 [Venta a crédito · Producto] Vencimiento de deuda hardcodeado a 30 días
`FEATURE-01` (31-08-2026): la `Debt` que se crea automáticamente al fiar una venta siempre queda con `dueDate` a 30 días desde la venta, sin que el cajero pueda elegirlo (a diferencia de la deuda manual en `debts-list.tsx`, que permite dejarlo vacío). No es un bug, es una decisión de producto no discutida — confirmar con Diego si 30 días fijo está bien o si conviene hacerlo configurable (por tenant o por venta).

#### 🔧 [Reportes · UX] Venta MIXED no se cuenta en "N ventas" de las tarjetas de Efectivo/Crédito
`FEATURE-01` (31-08-2026): en `reports.tsx`, los montos de "Ventas al contado"/"Ventas a crédito" ya reparten bien la porción de una venta MIXED (verificado que reconcilia), pero el subtítulo "X ventas (Y%)" de esas tarjetas solo cuenta `paymentType === "CASH"` o `=== "CREDIT"` puro — una venta mixta no suma en ninguno de los dos conteos. Cosmético, no afecta ningún monto.

#### 🤔 [Inventario/Cotizaciones · Producto] Stock reservado por cotizaciones pendientes es puramente informativo
Anotado por INGENIERODETESTEO en ambas secciones (Inventario y Cotizaciones, 31-08-2026). `getReservedStockByProduct` se calcula y se muestra en `quotes-list.tsx` y `GET /api/quotes/reserved-stock`, pero no se usa para bloquear ni descontar stock al crear una venta o confirmar otra cotización. Pregunta de producto: ¿está bien que dos cotizaciones puedan "prometer" la misma última unidad a dos clientes distintos (el que confirme primero se la lleva), o debería reservarse stock de verdad al emitir la cotización?

#### 🤔 [Inventario · Cosmético] `CodeCounter` de productos es global entre tenants, no por comercio
Anotado por INGENIERODETESTEO. El contador autogenerado de `productCode` (`src/lib/generate-code.ts`) es compartido por TODA la plataforma, no por tenant — un comercio nuevo puede ver que sus primeros productos arrancan en "PROD-0347" en vez de "PROD-0001". No causa ningún error real, solo puede generar dudas de soporte. No prioritario.

#### 🤔 [Promociones · Producto] `PromotionUsage` en devoluciones parciales (no totales) sin definir
Anotado por INGENIERODETESTEO al auditar Promociones (02-09-2026). PROMO-FIX-05 libera el cupo de uso en una devolución **total** de una venta con promoción. El caso de una devolución **parcial** (que no vacía la venta) queda sin definir si debe liberar cupo proporcional o no tocar nada. Decisión de producto, no bug.

#### 🔍 [POS · Verificación] Redondeo de IVA con tasas mixtas en un mismo carrito, no verificado
Anotado por INGENIERODETESTEO al auditar POS (31-08-2026). No se confirmó si puede aparecer un centavo de diferencia entre la suma de `SaleItem.total` y el total mostrado cuando el carrito mezcla ítems al 10.5%/21%/27% de IVA. Requiere prueba con casos reales, no solo lectura de código.

#### 🤔 [POS · UX] Cambio de precio de un producto mientras está en el carrito, sin aviso al cajero
Anotado por INGENIERODETESTEO. El backend recalcula el precio real al confirmar (correcto, evita cobrar de más/de menos), pero si el precio cambió entre agregar al carrito y confirmar, el cajero no recibe ningún aviso de que el monto cobrado en pantalla ya no coincide con lo que el backend va a registrar — relevante sobre todo en ventas MIXED.

#### 🤔 [POS · Producto] Una sola sesión de caja abierta por tenant, no por cajero/terminal
Anotado por INGENIERODETESTEO. Si el negocio real llega a operar con más de una caja física en simultáneo, todos los movimientos se mezclan en una sola sesión. No está claro si es una limitación conocida o una decisión de producto deliberada — pregunta para Diego, no bug.

#### 🤔 [POS · Feature ausente] No existe función de anular/cancelar una venta ya impactada en caja y stock
Anotado por INGENIERODETESTEO. Solo aparece nombrada en un test, no implementada en `src/modules/sales` ni en la API. La única forma de revertir una venta hoy es por Devoluciones. No es un bug, es una función que podría faltar si Diego la considera necesaria.

#### 🔍 Hallazgos menores confirmados durante el ciclo de INGENIERODETESTEO, sin prioridad asignada
Agrupados acá para no perderlos (todos de bajo impacto, ninguno con riesgo de plata):
- Dos líneas de `SaleItem`/línea de cotización para el mismo producto no se fusionan si llegaran a coexistir (hoy el carrito del POS ya fusiona por `productId`, así que no se pudo reproducir desde la UI actual).
- `Quote.quoteNumber` es único globalmente (como `productCode`/`customerCode` eran antes) — sin riesgo de colisión real hoy, candidato a agruparse en una futura migración batch si se decide hacerlo por tenant.
- `docNro`/CUIT en la config de ARCA no tiene validación de formato — AFIP lo rechaza con su propio error crudo (problema de UX, no de datos).
- No existe un reporte de "ventas sin facturar" — idea de feature, no bug.
- No se revisó el componente de impresión de cierre de caja para confirmar que reutiliza los mismos números guardados en `CashRegisterSession` en vez de recalcularlos aparte.
- Ventana de carrera muy angosta entre el chequeo de "caja abierta" (antes de abrir la transacción de venta) y un cierre de caja concurrente desde otro dispositivo — demasiado angosta para confirmar solo leyendo código.
- Doble click en "Emitir factura" con AFIP tardando en responder: el `@unique` de `Invoice.saleId` evita el duplicado local, pero si AFIP ya emitió un CAE real para el segundo intento antes de que el `INSERT` local falle, ese comprobante queda "vivo" en AFIP sin registro local — requiere reproducción contra homologación (ver `ARCA-02`).
- Pérdida del carrito en curso al cambiar de pestaña dentro del POS (Venta actual → Historial → Devoluciones) — no se revisó el manejo de estado de React, requiere prueba manual en vivo.
- Corte de sesión de otro usuario mientras un cajero tiene una venta a medio cobrar — depende del comportamiento del middleware/sesión en vivo, no se puede confirmar solo con lectura de código.

---

## Integraciones Externas

> Todo lo que depende de una app, servicio o panel de terceros (Rebill, ARCA/AFIP, Resend, Cloudflare) o de acceso manual de Diego a esos paneles. No son algo que el agente de código pueda resolver solo — quedan al final a propósito.

#### 🛠️ T31 — Variables de entorno completas en Vercel (Rebill, Resend, Anthropic) — 🔴 Crítico
Faltan en Vercel: `REBILL_WEBHOOK_SECRET`, `REBILL_API_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`. También confirmar que `DATABASE_URL` usa la URL directa de Neon (sin `-pooler`) para migraciones, y que `SOLVEN_SESSION_SECRET` tiene un valor seguro en producción (ver ítem T2 arriba).

#### 🔧 QA-05 — Rebill acepta firma inválida si falta `REBILL_WEBHOOK_SECRET` — 🔴 Crítico
Ya documentado como bug activo conocido en `CLAUDE.md`, **diferido intencionalmente por Diego a fin de proyecto**. Sin la variable configurada, el webhook acepta cualquier firma → riesgo de fraude en pagos. Fix: fallar cerrado (400) si la variable no está configurada.

#### 🛠️ 📧 Configurar Resend — verificar dominio + `NEXT_PUBLIC_APP_URL` — 🟠 Alto
1) Verificar dominio `solvenrs.com` en Resend (registros DNS). 2) Actualizar `NEXT_PUBLIC_APP_URL=https://www.solvenrs.com` en Vercel (si tiene la URL vieja de Vercel, rompe los links en emails transaccionales). 3) Test de email real desde producción.

#### 🤔 POSNET-AUTO-01 — Monto automático en el posnet/datáfono al cobrar con tarjeta — 🟡 Medio
Anotado por Diego el 02-09-2026. Idea: que al elegir "Tarjeta" como método de pago en el POS, el monto a cobrar se mande solo al posnet/datáfono físico, sin que el cajero tenga que volver a tipearlo a mano en el aparato — reduce un paso manual y un punto de error (tipear mal el monto en el posnet es una fuente real de diferencias de caja).

Esto depende 100% de qué proveedor de posnet/datáfono usan los comercios que usan SOLVEN — no hay un estándar único en Argentina. Antes de poder escribir una orden de código hace falta que Diego (o una sesión de research aparte) resuelva: (a) qué proveedor(es) priorizar primero — los más comunes en el mercado argentino son Mercado Pago Point (tiene SDK/API pública, probablemente el candidato más viable técnicamente porque no depende de integración bancaria), Getnet, Lapos/Prisma, Naranja X POS — cada uno con su propio SDK/protocolo, y varios requieren integración a nivel de fabricante de hardware o acuerdos comerciales con el procesador, no solo una API REST; (b) si el objetivo es integración por Bluetooth/USB con un posnet conectado a la misma terminal donde corre SOLVEN, o integración cloud (mandar el cobro a una cuenta/dispositivo vinculado, como hace Mercado Pago Point); (c) si esto se limita a un solo proveedor al principio (más realista) o si necesita ser plugable para varios. No es un fix de UI — es una integración de hardware/pagos nueva, con su propio ciclo de investigación técnica antes de poder scopearla como orden.

**Extensión anotada por Diego el 03-09-2026:** el mismo mecanismo debe aplicar también al momento de devolver — cuando se hace clic en "Devolver" y el reintegro incluye un componente en Tarjeta, el monto correspondiente a esa parte debería mandarse solo al mismo datáfono/posnet con el que se cobró originalmente (no que el cajero lo vuelva a tipear a mano en el aparato al hacer la devolución). Mismo bloqueo que arriba: depende del proveedor de posnet elegido — cuando se resuelva el research de la parte de cobro, extender el mismo mecanismo al flujo de reintegro descrito en `RET-UX-02` (ver orden en `TAREAS/`, sección de reintegro por método de pago real).

#### 🤔 CAJA-DRAWER-01 — Apertura automática del cajón de efectivo al cobrar o devolver en efectivo — 🟡 Medio
Anotado por Diego el 03-09-2026. La típica "casa" o cajón de efectivo (el que va debajo del mostrador, con los billetes y monedas organizados por compartimento) debería abrirse automáticamente cuando se cobra en Efectivo en el POS, o cuando se procesa una devolución con reintegro en Efectivo — hoy no hay ninguna integración con hardware de caja.

Igual que POSNET-AUTO-01, esto depende de hardware físico: la mayoría de los cajones de efectivo se abren por un pulso eléctrico enviado desde una impresora térmica compatible (protocolo ESC/POS, comando de "cash drawer kick" por el puerto RJ11/RJ12 de la impresora) o, menos común, por un driver USB/serial dedicado del fabricante del cajón. Antes de poder escribir una orden de código hace falta resolver: (a) qué impresora térmica/cajón usan (o van a usar) los comercios — esto también es un prerrequisito del ticket de papel térmico que Diego mencionó como próximo tema de trabajo, así que probablemente conviene resolver ambos juntos; (b) si la apertura se dispara desde el navegador (requiere una conexión local a la impresora — WebUSB/WebSerial o un servicio intermediario local, porque el navegador no tiene acceso directo a puertos seriales sin eso) o desde un agente/servicio instalado en la caja; (c) si además de automático hace falta un botón manual de "abrir cajón" para casos donde se cobra en efectivo sin usar el POS (vuelto, cambio, etc.). No es un fix de UI — es una integración de hardware nueva, con su propio ciclo de investigación técnica antes de poder scopearla como orden.

#### 🛠️ 💳 "Integrar Rebill" (tarjeta de Notion, probablemente duplicada) — 🟡 Medio
Esta tarjeta describía crear cuenta Rebill, API keys, webhook y flujo de cobro — pero **T14 ("Integración completa con Rebill") ya está completada** en Notion y coincide con lo que hay en el código (`prisma/schema.prisma` modelo `Subscription`, `src/app/api/webhooks/rebill/route.ts`, middleware que bloquea acceso si `CANCELLED`/`EXPIRED`). Lo único potencialmente real de esta tarjeta es "probar en sandbox antes de activar en producción" — no hay evidencia de que se haya hecho. Si Diego confirma que nunca se probó en sandbox, vale la pena una sesión de QA ahí; si no, esta tarjeta es redundante y se puede descartar.

#### 🛠️ ☁️ Configurar Cloudflare — CDN + DDoS + nameservers — 🟡 Medio
Manual: crear cuenta Cloudflare (Free), agregar dominio `solvenrs.com`, cambiar nameservers en el registrar, esperar propagación (24-48hs), verificar que Vercel siga funcionando con los DNS de Cloudflare, activar Always HTTPS + HSTS.

#### 🛠️ ARCA-02 — Setup ambiente de homologación (testing ARCA) — 🟡 Medio
Requiere acceso manual de Diego al portal ARCA con Clave Fiscal nivel 3 — no se puede automatizar. **Nota:** ARCA ya está en producción (WSAA+WSFE implementado), así que esto ya no es un gate previo al lanzamiento; su valor ahora es tener un ambiente seguro para probar cambios futuros al código de ARCA sin tocar producción.

#### 🔍 ARCA-11 — Documentar casos de prueba de facturación ARCA con evidencia de CAE en producción — 🟠 Alto
*(Reformulada respecto a la tarjeta original de Notion, que pedía testear en homologación antes de habilitar producción — esa condición ya no aplica porque producción está live desde antes.)* Documentar casos de prueba reales (distintos tipos de comprobante, montos, escenarios de error) con el CAE obtenido como evidencia, directamente en producción.
**Por qué importa:** en este mismo ciclo encontramos y corregimos FIX-08 (vulnerabilidad de confianza-de-cliente en la emisión de facturas ARCA) — sugiere que la superficie de ARCA no tuvo todavía una pasada de QA rigurosa y documentada.

---

## Cerrados

### 2026-09-04 — RET-DEV-METODO: el reintegro ahora se valida contra el desglose real de pago (CERRADO — RET-UX-02)
`processReturn` (`src/modules/returns/index.ts`) ya no acepta un único `refundMethod` desconectado de cómo se cobró la venta: cada línea de `refundDetails` se valida contra los métodos reales presentes en `Sale.paymentDetails` (o Efectivo puro para ventas `CASH` sin desglose), con tope por método considerando devoluciones parciales previas de la misma venta. El movimiento de caja (`CashMovement` OUT) ahora se genera solo por la suma de las líneas "Efectivo" del reintegro, no por el total — cierra exactamente el riesgo de arqueo que motivaba este ítem. Ver entrada de verificación de RET-UX-02 en `REPORTELIDER.md` para el detalle completo.

### 2026-09-02 — COT-FOLLOWUP-01: método real de pago al confirmar cotización ahora queda en la venta (CERRADO — Ingeniero Líder, directo)
Arreglo directo, sin pasar por el ciclo agente-VS Code, a pedido de Diego. `confirmQuote` (`src/modules/quotes/quote-data-access.ts`) ahora llena `Sale.paymentDetails` con `[{ method, amount: netTotal }]` para Efectivo/Tarjeta/Transferencia (`Prisma.JsonNull` para Crédito, igual que una venta 100% a crédito por POS no tiene desglose de cobro). Reusa el mismo formato `{ method: string; amount: number; reference?: string }[]` ya usado en `sale-validation.ts`/`sale-data-access.ts` para ventas normales — así una cotización confirmada por transferencia queda indistinguible en reportes de una venta por transferencia hecha directo en el POS, incluyendo el filtro existente `paymentDetails: { array_contains: [{ method }] }` en `sale-data-access.ts:417`. 2 tests de integración nuevos/ampliados en `quote-data-access.integration.test.ts`: confirma que `paymentDetails` trae el método y el monto neto exacto para Efectivo y Tarjeta, y que queda `null` para Crédito. `typecheck` y `lint` re-corridos en el sandbox, limpios (no se pudo correr `npm test`, limitación conocida del entorno — releída la implementación y los tests línea por línea).

### 2026-09-01 — Decisión de producto: gasto recurrente en efectivo se bloquea sin caja abierta (CERRADO — Diego)
Diego confirmó bloquear (comportamiento post-`CAJA-FIX-03`) en vez de generar igual sin caja abierta, con un ajuste al gap real que dejaba la pregunta mal planteada: `RecurringExpense` no tenía campo de método de pago, así que el cron trataba TODOS los gastos recurrentes como si fueran efectivo, sin importar si en realidad son transferencia (lo más común para alquiler/suscripciones). Implementado directamente (sin pasar por el agente de VS Code): campo `method` agregado a `RecurringExpense` (migración `20260901150000_add_recurring_expense_method`, aplicada a Neon y verificada con consulta de solo lectura), mismo selector Efectivo/Tarjeta/Transferencia/Otro que ya existía para el gasto puntual — el checkbox "repetir cada mes" ahora reusa el mismo método elegido, sin UI nueva. El guard de caja abierta solo aplica cuando el método declarado es "Efectivo". Además, el cron ahora hace "catch-up": si un gasto recurrente no se generó el día que le tocaba (por caja cerrada, outage, etc.), se genera en la próxima corrida exitosa dentro del mismo mes en vez de esperar hasta el mes siguiente. Tests agregados: `recurring-expense-validation.test.ts` (7 casos) y ampliado `recurring-expense-data-access.test.ts` (6 casos, con reloj simulado para que la lógica de día-del-mes sea determinista). `typecheck`/`lint` limpios; no se pudo correr `npm test` en este sandbox (limitación conocida), releídos los mocks contra la implementación real. Detalle en `TAREAS/REPORTELIDER.md`.

### 2026-09-01 — Aislado por tenant el cron de gastos recurrentes (CERRADO — Ingeniero Líder, sin espera a la decisión de producto)
`generateDueRecurringExpenses()` (`src/modules/recurring-expenses/recurring-expense-data-access.ts`) ahora envuelve cada gasto recurrente en su propio `try/catch` dentro del loop — si un tenant falla (típicamente `CashRegisterNoSessionOpenError` desde `CAJA-FIX-03`), se registra en un array `failures` y el loop sigue con el resto de los tenants, en vez de cortar ahí. La función pasó de devolver un `number` a `{ generatedCount, failures }`; el cron (`route.ts`) loguea las fallas con `console.error` para que queden visibles en Vercel y las devuelve en la respuesta, sin abortar. El tenant que falla no marca `lastGeneratedMonth`, así que sigue "due" (mismo comportamiento que ya existía ante cualquier otra interrupción del cron, no se cambió esa semántica). Agregado `recurring-expense-data-access.test.ts` (3 tests, con `prisma` y `createExpense` mockeados — no toca la DB real ni tenants reales) probando: generación exitosa simple, que un tenant que falla no bloquea al siguiente, y que un gasto no debido hoy se saltea. `typecheck`/`lint` verificados; no se pudo correr `npm test` en este sandbox (limitación conocida de este entorno, no del código — ver `CLAUDE.md` sección 11), se releyeron los mocks y aserciones línea por línea contra la implementación real. Queda pendiente solo la pregunta de producto de arriba (🔴 Crítico → movida a 🟡 Medio, ya no es urgente porque el riesgo cross-tenant está resuelto).

### 2026-08-31 — RET-FIX-01..07: 7 hallazgos de INGENIERODETESTEO sobre Devoluciones (CERRADO — commit `6a36a95`)
Incluye el bug que estaba abierto acá desde antes de que existiera el rol formal: `processReturn` no reducía la `Debt` de una venta `MIXED` (solo `CREDIT`) — corregido con `(sale.paymentType === "CREDIT" || sale.paymentType === "MIXED") && sale.debtId`. Además: carrera de concurrencia en la cantidad ya devuelta (transacción `Serializable` + `ReturnConcurrentConflictError`), reintegro ya no era a precio de lista sino prorrateado por el descuento real de la venta, `GET /api/returns` sin rol, reintegro en efectivo sin exigir caja abierta, y devoluciones sin quedar en `AuditLog`. Un ítem quedó diferido por decisión de producto, no de código (RET-FIX-06, devolución de venta de Servicio) y otro sigue abierto como pregunta para Diego (ver `TAREAS/ordenestest.md`, sección Devoluciones → Inconcluso: si el método de reintegro debería validarse contra `Sale.paymentDetails` cuando la venta original fue con pago dividido). Verificado por el Ingeniero Líder contra el diff real, `typecheck`/`lint` limpios. Detalle completo en `TAREAS/REPORTELIDER.md`.

### 2026-08-31 — FEATURE-01: venta a crédito/fiado real, CREDIT + MIXED (CERRADO — commits `cb45e3d`..`aa3ee45`)
Implementación completa: `sale-validation.ts` acepta CASH/CREDIT/MIXED y exige cliente para los dos últimos; `createSale` deriva el monto cobrado en el servidor (`netTotal - collectedNow`, nunca confía en un "monto fiado" que mande el cliente), crea una `Debt` 1:1 por venta (`Sale.debtId`), genera `CashMovement` solo por lo efectivamente cobrado (ninguno en CREDIT puro), y baja stock igual que una venta de contado. Límite de crédito: rechaza si `Debt.remainingAmount` (no saldadas) + el nuevo monto fiado supera `Customer.creditLimit`; OWNER puede pasar por encima (usa `session.role` del servidor, no falseable por el cliente); `customerId` se valida contra `tenantId` antes de crear la deuda. POS: cualquier remanente sin asignar en "Cobrar" pasa a ser fiado (CREDIT si es todo, MIXED si es parcial), exige cliente seleccionado. Reportes: `saleCashPortion`/`saleCreditPortion` reparten la porción MIXED entre ambos totales — verificado que reconcilian exacto con el neto en los 3 casos. Se arrastró un fix menor: `CreateSaleModal` en `sales-list.tsx` nunca mandaba el `customerId` seleccionado.

**Verificación del Ingeniero Líder commit por commit contra el diff real**, incluyendo el rollback del límite de crédito (hay test que confirma que un rechazo no deja deuda huérfana ni descuenta stock) y la reconciliación de montos. `typecheck`/`lint` reverificados limpios de forma independiente; no se pudo correr `npm test` en este sandbox (limitación conocida de `rollup` en Linux, ver `CLAUDE.md` sección 11) pero se leyeron los 4 tests de integración nuevos línea por línea contra lo que afirman cubrir. Dos notas menores sin bloquear el cierre, documentadas arriba en "Medio": vencimiento de deuda hardcodeado a 30 días, y una venta MIXED no se cuenta en el subtítulo "N ventas" de Reportes (el monto sí está bien repartido). Pendiente documentado por el propio agente: `CreateSaleModal` (modal secundario de ventas) no tiene UI de pago dividido, así que el fiado completo solo se opera desde el POS. Detalle completo en `TAREAS/REPORTELIDER.md`.

### 2026-08-30 — FIX-15 + FIX-16: 11 bugs menores/medianos de QA-CHROME-01 (CERRADO — 11 commits, `8677d2a`..`9200aa7`)
Los 11 hallazgos confirmados y no críticos de QA-CHROME-01 (QA-CHROME-01-c) quedaron resueltos: **FIX-15** — categoría real de producto en Reportes (`categoryName` en vez de heurístico por nombre), "Mi Negocio" muestra mensaje de acceso en vez de 0/8 para no-Owner, placeholder de agradecimiento ya no se confunde con texto real, SKU deja de ser obligatorio en el form (el backend siempre lo autogenera), papelera del carrito del POS pide confirmación igual que "Limpiar venta", "Devoluciones" en Cierre de Caja muestra el monto real de la sesión (sin doble descuento — el "Total esperado" seguía usando `totalCashOut`, que ya las incluía), indicador de caja del sidebar se refresca con eventos `cash-register-closed`/`cash-register-opened`. **FIX-16** — cotización limpia Email/Teléfono al cambiar de cliente, selector de IVA agregado al formulario de producto (`IVA_RATES`, ya soportado por el backend) y el resumen del carrito del POS calcula el IVA real (mismo criterio que `handlePrintInvoice`, verificado línea por línea que es la fórmula idéntica), botón "Imprimir factura" se renombra a "Imprimir comprobante (no fiscal)" cuando no hay CAE real, y se unificaron los dos mecanismos de "Suspender venta" en uno solo persistido en `localStorage` (con migración automática del formato viejo de borrador único al nuevo formato de lista). Verificado por el Ingeniero Líder commit por commit contra el diff real — sin hallazgos, `typecheck`/`lint` reverificados limpios de forma independiente. Detalle completo en `TAREAS/REPORTELIDER.md`.

### 2026-08-30 — FIX-14: monto neto en caja/reportes + Ajustes oculto por defecto (CERRADO — commits `50eddaa`, `30eecc9`, `62abb5a`)
El agente de VS Code ejecutó los 2 bugs críticos de QA-CHROME-01: (1) `CashMovement`/reportes/cierre de caja ahora usan el monto neto (`totalAmount - discountAmount`) en vez del bruto cuando hay promoción aplicada; (2) `DEFAULT_HIDDEN` en `role-permissions-table.tsx` ahora oculta "Ajustes" por defecto también para CASHIER/INVENTORY/READONLY, no solo SUPERVISOR. **Verificación del Ingeniero Líder contra el diff real encontró un bug crítico no reportado por el agente:** el helper `saleNet` agregado en `src/app/ui/reports.tsx` se llamaba a sí mismo en vez de leer `sale.totalAmount` — recursión infinita que crasheaba cualquier tab de Reportes en runtime (no lo detectaban typecheck/lint/tests porque es válido en tipos y no hay test de render para esa pantalla). Corregido por el Ingeniero Líder en `62abb5a`, typecheck y lint reverificados limpios. Detalle completo en `TAREAS/REPORTELIDER.md`.

### 2026-07-23 — DESIGN-01 + DESIGN-02: pulido visual de estilo en toda la app (CERRADO — merge `b0d9b0d`)
Pasada única de estilo (Fable) sobre las ~34 pantallas de `src/app/ui/` con lenguaje unificado (`docs/estilo-ui.md`: radios en 4 niveles, tarjeta estándar `rounded-2xl border-slate-100 bg-white shadow-sm p-5`, KPIs `font-semibold tracking-tight`). Cero cambios de lógica/datos/rutas — verificado por el Ingeniero Líder contra el diff completo (`src/modules`, `src/app/api`, `prisma`, `middleware.ts`, `tenant.ts`, `auth.ts` sin tocar; sidebar oscuro intacto). DESIGN-02 corrigió 2 hallazgos de esa verificación: `role-permissions-table.tsx` (una de las pantallas que había quedado sin tocar) y una corrupción de encoding real (mojibake UTF-8→CP1252) en `settings.tsx`/`sales-list.tsx`, restaurada y verificada a nivel de bytes. Diego revisó el preview de Vercel y aprobó el resultado visual. Mergeado a `main` en `b0d9b0d`. Falta el push/deploy desde la máquina de Diego para que tome efecto en producción.

### 2026-07-22 — QA-01, QA-02, QA-04 (CERRADO — FIX-13, commit `551ac74`)
Los 3 fixes críticos que quedaban del backlog general (no de integraciones externas) se resolvieron en una sola orden: `scripts/seed-icase.mjs` ahora usa `prisma.product.upsert()` por `productCode` (ya no falla `P2002` al re-correr); `src/middleware.ts` devuelve JSON 401/402 en vez de redirect cuando `pathname` empieza con `/api/` (páginas sin cambios); los 3 cron jobs (`expire-quotes`, `generate-recurring-expenses`, `remind-expiring-quotes`) ahora rechazan si falta `CRON_SECRET` fuera de `NODE_ENV==='development'`. Verificado por el Ingeniero Líder contra el diff completo (`git show 551ac74`) y `typecheck` reverificado independientemente, limpio. Detalle en `TAREAS/REPORTELIDER.md`.

### 2026-07-18 — Auditoría completa de Notion: 6 tarjetas "Pendiente" ya estaban resueltas en el código
Al migrar todo Notion a este archivo, se verificó cada tarjeta contra el código real (no solo se confió en el texto de Notion). Estas 6 figuraban como "⏳ Pendiente" pero ya estaban resueltas:
- **🖥️ T16 — requireRole en endpoints de escritura**: verificado en `sales`, `returns`, `debt-payments`, `cash-register`, `customers`, `promotions` — los 6 ya usan `requireRole(...)` envuelto en try/catch con `ForbiddenError`/`UnauthorizedError` manejados correctamente. No se sabe cuándo se resolvió (no fue en las órdenes de esta sesión).
- **QA-03 — invoice no valida saleId por tenantId**: es el mismo bug que **FIX-08** (ya documentado), resuelto y verificado ese mismo commit.
- **QA-06 — /api/noa devuelve 500 sin ANTHROPIC_API_KEY**: el endpoint ya valida la key y devuelve un JSON de error controlado — la única diferencia con lo pedido es el status code (500 en vez del 503 sugerido), un detalle menor, no un crash sin control.
- **QA-07 — pagos concurrentes de deuda filtran error Prisma crudo**: `debt-payment-data-access.ts` ya captura `PrismaClientKnownRequestError` (P2034/P2028), reintenta una vez, y si persiste lanza `DebtPaymentAmountError` en vez del error crudo.
- **QA-08 — Service.ivaRate hardcodeado**: resuelto por **FIX-10** (ya documentado en este archivo y en `CLAUDE.md`).
- **QA-09 — sendQuoteExpiringReminderEmail sin conectar**: verificado que `src/app/api/cron/remind-expiring-quotes/route.ts` ya la invoca. Ya documentado como resuelto en `CLAUDE.md`.

También se encontró que **ARCA-01** (doc de arquitectura técnica, marcada bloqueante para el resto de ARCA) nunca se escribió como archivo (`docs/arca-architecture.md` no existe), pero todo el trabajo downstream que dependía de ella (ARCA-03 a ARCA-10) ya está completado en Notion y coincide con el código. Es deuda de documentación, no un bloqueante real — no se migra como pendiente activo, solo se deja esta nota.

### 2026-07-18 — Borrar `SOLVEN_PASSWORD` / `SOLVEN_USER` de Vercel (CERRADO)
Confirmado por dos vías independientes que ninguna se usaba: grep en el código (sin referencias en `src/` desde FIX-11) y revisión en Vercel vía agente de Chrome (BROWSER-01, sin uso detectable en Build Logs). Borradas de Production y Preview por el agente de Chrome — Vercel confirmó "Removed Environment Variable successfully". Falta un próximo deploy normal para que el cambio tome efecto (no se forzó redeploy).

### 2026-07-18 — `requireTenantId()` sin try/catch en subscription y dashboard/summary (CERRADO)
Hallazgo de TESTS-01. Resuelto en FIX-12 (commit `a8ee593`): ambos endpoints ahora envuelven `requireTenantId()` en try/catch y devuelven 401 en vez de propagar la excepción. Verificado por el Ingeniero Líder contra el diff, typecheck limpio. Ver `CLAUDE.md` sección 5.
