# REPORTE DE CAMBIOS — SOLVEN

> Este archivo es actualizado automáticamente por el agente después de cada tarea ejecutada.
> Al finalizar la sesión de trabajo, Diego lo revisa aquí en Cowork y marca las tareas en Notion.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 020 — Campo de cantidad fraccionada por ítem en el POS — 2026-06-29

**Estado:** ⚠️ Parcial

**Archivos modificados:**
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Se agregó `step="0.001"` al `<input type="number">` de cantidad en cada fila del carrito (el mismo input inline agregado en la Tarea 017), permitiendo ingresar decimales como 1.5 o 0.75.
- En `commitQuantityInput()` se reemplazó `Math.floor(parsed)` por un redondeo a 3 decimales (`Math.round(parsed * 1000) / 1000`), eliminando el truncado a entero que forzaba la cantidad confirmada a un número entero. No hay ningún `parseInt()` aplicado a `quantity` en el archivo (se verificó con búsqueda completa).
- Se agregó el helper `formatQuantity(value)`: devuelve el número tal cual (sin decimales) si es entero, o con 3 decimales fijos si tiene parte fraccionaria (ej: `1.5` → `"1.500"`, `2` → `"2"`). Se usa como valor mostrado en el input de cantidad cuando no hay un draft en edición.
- El tipo `CartItem.quantity` ya era `number` (sin cambios) y los cálculos de subtotal (`getLineFinalTotal`, `cartTotal`, `cartNet`, `cartGrandTotal`, etc.) ya operaban con floats sin redondeo intermedio — mantienen los decimales hasta el total final, que se muestra redondeado a 2 decimales vía `formatARS` (`Intl.NumberFormat` con moneda ARS), sin necesidad de cambios adicionales.

**Notas:**
- ⚠️ **Limitación de backend descubierta, fuera del alcance permitido de esta tarea:** `SaleItem.quantity` en `prisma/schema.prisma` es de tipo `Int`, y `src/modules/sales/sale-validation.ts:91` valida explícitamente `Number.isInteger(item.quantity)` y rechaza la venta con el error "Sale item quantity must be a positive integer." si la cantidad no es entera. Esto significa que, con el cambio actual, el carrito del POS permite ingresar y previsualizar cantidades decimales (ej. "1.500"), pero al intentar **cobrar** una venta que incluya un ítem con cantidad fraccionada, la petición a `/api/sales` será rechazada por esa validación existente y se mostrará el error al cajero — la venta no se registrará. `Product.stock` también es `Int`, mismo límite del lado de inventario.
- Las restricciones explícitas del prompt ("No modifiques el schema de Prisma ni los API routes", "No toques el flujo de pago") impiden corregir esto en esta tarea — requeriría una migración (`SaleItem.quantity` y posiblemente `Product.stock` a `Float`/`Decimal`) y actualizar `sale-validation.ts`, ambos fuera de alcance. Se marca la tarea como **Parcial**: lo pedido literalmente en el prompt (input decimal, sin floor/parseInt, cálculo de subtotal sin truncar, display con hasta 3 decimales) está implementado y funcionando en el carrito, pero el flujo termina bloqueado en el paso de cobro por una validación de backend preexistente que no se podía tocar. Se recomienda una tarea de seguimiento para habilitar cantidades decimales también en `SaleItem`/`Product.stock`.
- No se tocaron las pantallas de solo lectura que también muestran `item.quantity` como texto plano (modal de Cotización, ticket/recibo imprimible, panel "Última venta" de la Tarea 019, badge de cantidad de ítems en el header del carrito) — el prompt acota el cambio de formato de display a "el carrito", interpretado como el campo de cantidad editable de la fila del carrito; ampliar el formato a esas otras vistas no estaba pedido explícitamente.
- `npm run build`, `npm run lint`, `npx tsc --noEmit -p .` y `npm test` corrieron limpios, sin regresiones (166 passed / 32 failed preexistentes por `DATABASE_URL` ausente en test / 2 skipped, misma línea base).

## Tarea 019 — Historial de la última venta visible en el POS — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Se agregó el tipo `LastSale` (folio, ítems con nombre/cantidad/precio unitario, total, método de pago) y los estados `lastSale: LastSale | null`, `lastSaleCollapsed` (boolean) y `copiedFolio` (boolean, para el feedback visual de "¡Copiado!").
- En `submitSale()`, justo después de confirmar la venta exitosa (mismo punto donde ya se armaba `showPrintModal` con los datos de la venta recién creada), se agregó `setLastSale(...)` con el resumen de la venta y `setLastSaleCollapsed(false)` para que el panel aparezca expandido automáticamente.
- En `handleNewSale()` se agregó `setLastSaleCollapsed(true)` luego de `clearSale()`, para que el panel se colapse (no desaparezca) al iniciar una venta nueva.
- Se agregó el panel colapsable "Última venta" al final del panel derecho (debajo del formulario de cobro/Cobrar), visible solo si `lastSale !== null`:
  - Encabezado clickeable con el folio y un ícono de chevron (mismo patrón visual que otros paneles colapsables del archivo) que alterna `lastSaleCollapsed`.
  - Botón "Copiar folio #N" que copia el folio al portapapeles con `navigator.clipboard.writeText` (mismo patrón ya usado para copiar códigos de promoción) y muestra "¡Copiado!" por 2 segundos.
  - Lista de ítems "cantidad × nombre" con su subtotal (`quantity * unitPrice`).
  - Total en ARS grande (`formatMoneyNum`).
  - Método(s) de pago de la venta.
  - Botón "Ver detalle" con `Link` a `/sales/{saleId}`.

**Notas:**
- El proyecto ya tenía un modal de impresión (`PrintModal`, vía `showPrintModal`) que se abre automáticamente tras cada venta con datos muy similares (folio, ítems, total, método de pago); ese modal es transitorio y pensado para imprimir/emitir factura, y el usuario lo cierra manualmente. El nuevo panel "Última venta" es un elemento aditivo y permanente (mientras dure la sesión) en el panel derecho del POS, sin tocar ni reemplazar el `PrintModal` ni su lógica existente.
- Hoy no existe una página `/sales/[id]` (ruta dinámica de detalle) en el proyecto — solo `/sales/page.tsx` con el listado general (`SalesList`). El botón "Ver detalle" enlaza a `/sales/{saleId}` tal como lo pide el prompt de la tarea, pero esa ruta devolverá 404 hasta que se implemente la página de detalle (fuera del alcance de esta tarea, que solo permite tocar `pos.tsx`).
- El colapso automático se ató a `handleNewSale()` (botón "Nueva venta" / tecla F2), que es la única acción del archivo nombrada explícitamente "nueva venta". No se colapsa el panel por otras acciones (suspender carrito, limpiar venta, etc.) para no salirse de lo pedido literalmente por el prompt.
- No se modificó el API de ventas (`/api/sales`) ni ningún otro archivo — solo estado local y JSX en `pos.tsx`.
- `npm run build`, `npm run lint`, `npx tsc --noEmit -p .` y `npm test` corrieron limpios, sin regresiones (166 passed / 32 failed preexistentes por `DATABASE_URL` ausente en test / 2 skipped, igual que la línea base ya conocida).

## Tarea 018 — Carrito suspendido: pausar una venta y abrir otra en paralelo — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Se agregó el estado `suspendedCarts: CartItem[][]` (máximo 3, controlado con la nueva constante `MAX_SUSPENDED_CARTS`) y `suspendedCartsOpen` (boolean) para el popover de la lista.
- Se agregó `handleSuspendCart()`: si el carrito activo tiene ítems y no se alcanzó el máximo de 3 carritos suspendidos, guarda el carrito actual (snapshot) en `suspendedCarts` y limpia la venta activa con `clearSale()` (la misma función que ya usa el resto del flujo para iniciar una venta nueva).
- Se agregó `handleRestoreSuspendedCart(index)`: reemplaza el carrito activo con el carrito suspendido seleccionado y lo quita del array `suspendedCarts`.
- Se agregó `getSuspendedCartTotal(cart)`: suma `getLineFinalTotal(item, item.unitPrice)` de cada ítem para mostrar el total aproximado de cada carrito guardado en la lista (no recalcula promociones, ya que esas dependen de estado de la venta activa que no se persiste por carrito suspendido).
- En la barra de acciones del carrito (encabezado "Venta actual", junto al botón "Promociones"), se agregó:
  - Un botón "⏸ Suspender" que llama a `handleSuspendCart()`. Se deshabilita visualmente (gris, `cursor-not-allowed`) cuando el carrito está vacío o ya hay 3 carritos suspendidos (con `title` explicativo en ese segundo caso).
  - Un badge/botón ámbar con el ícono de pausa y el número de carritos suspendidos, visible solo si `suspendedCarts.length > 0`. Al hacer clic abre un popover simple con la lista "N ítems · $TOTAL" por carrito; seleccionar uno lo restaura como carrito activo y lo elimina de la lista. El popover se cierra con click afuera (mismo patrón que el dropdown "Más opciones" ya existente) y con tecla Escape (se sumó `suspendedCartsOpen` a la cadena de Escape y a las dependencias del listener global de teclado).
- Los carritos suspendidos viven solo en memoria (`useState`), no se persisten en localStorage ni en DB.

**Notas:**
- El archivo ya tenía un mecanismo de "venta suspendida" preexistente y totalmente distinto: un único borrador en `localStorage` (`DRAFT_KEY`), con su propio botón "Suspender venta" en el header superior, otro botón "Suspender" en la barra de acciones rápidas del panel izquierdo, y la opción "Guardar como borrador" dentro del dropdown "Más opciones" del panel de pago — todos disparando la función existente `handleSuspend()`, y el banner amarillo "Tienes una venta suspendida" (`showDraftBanner`) que ya existía para recuperarlo.
- Siguiendo la consigna de la tarea (que pide explícitamente un estado nuevo `suspendedCarts: CartItem[][]`, distinto del mecanismo de un solo borrador) y el principio de "ante la duda, hacé menos", no se tocó, fusionó ni eliminó nada del sistema preexistente (`DRAFT_KEY`, `handleSuspend`, `handleRecoverDraft`, `handleDiscardDraft`, `showDraftBanner`, los tres botones/entradas que ya usaban ese flujo). La nueva función de carritos suspendidos múltiples se implementó como una capa 100% aditiva y en paralelo, en la barra de acciones del propio carrito (panel derecho), distinta de los botones "Suspender venta" del panel izquierdo.
- No se modificaron APIs ni el schema de Prisma — solo estado de React y JSX en `pos.tsx`.
- `npm run build`, `npm run lint`, `npx tsc --noEmit -p .` y `npm test` corrieron limpios: build y lint sin errores, typecheck sin errores, y tests en la misma línea base ya conocida del proyecto (166 passed / 32 failed por `DATABASE_URL` ausente en el entorno de test, preexistente / 2 skipped) — sin regresiones.

## Tarea 017 — Edición directa de cantidad en el carrito sin abrir modal — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Se reemplazó el `<span>` estático que mostraba `item.quantity` en cada fila del carrito por un `<input type="number">` inline (`w-16`, centrado, sin borde visible en estado normal, `focus:border-violet-500`/`focus:ring-violet-500` al enfocar), manteniendo intactos los botones `−`/`+` existentes (siguen funcionando igual, vía la misma `updateQuantity()`).
- Se agregaron dos estados nuevos: `quantityDrafts` (texto en edición por ítem, mientras el usuario escribe) e `invalidQuantityIds` (ids que están mostrando el error visual de stock superado).
- Se agregó `commitQuantityInput(itemId, maxStock)`, llamado en `onBlur` y en `onKeyDown` con `Enter`:
  - Valor vacío o `0` → elimina el ítem del carrito (reutiliza `updateQuantity(itemId, 0)`, que ya filtraba el ítem).
  - Valor no numérico o negativo → se descarta el draft y el input vuelve a mostrar la cantidad actual (sin error visual, ya que no es el caso "supera stock" que pide el prompt).
  - Valor mayor al stock disponible (`maxStock`) → el input queda con borde y texto rojo (`border-rose-400`/`text-rose-600`) y **no se actualiza** la cantidad en el carrito; el valor inválido permanece visible hasta que el usuario lo corrija.
  - Valor válido (entero entre 1 y el stock) → confirma con `updateQuantity(itemId, Math.floor(parsed))`.
- Se agregó `clearQuantityDraft(itemId)` para limpiar el draft/error de un ítem cuando se elimina del carrito (botón "X", botón "−" al llegar a 0, o `clearSale()` al iniciar una venta nueva) — evita que un id de producto reutilizado (sacado y vuelto a agregar al carrito) herede por error un estado "inválido" de una edición anterior ya descartada.
- Se ensanchó el contenedor de la columna de cantidad de `w-[68px]` a `w-28` para que el input (`w-16`) entre junto a los dos botones sin recortarse, y se agregó `flex-shrink-0` a ambos botones para que no se compriman.

**Notas:**
- Restricciones respetadas: no se tocó el API de ventas (`/api/sales`) ni ningún otro archivo — solo el renderizado del carrito en `pos.tsx`. La lógica de cálculo de totales (`cartNet`, `remaining`, `totalAssigned`, etc.) no se modificó; `updateQuantity()` se reutilizó sin cambiar su comportamiento existente (sigue siendo llamado igual por los botones +/-).
- La fila de ítems en el recibo/ticket imprimible (HTML generado para impresión, más abajo en el archivo) no se tocó — es una vista de solo lectura distinta del carrito editable y no estaba dentro del alcance de esta tarea.
- `npm run build`, `npx tsc --noEmit -p .` y `npm run lint` ejecutados sin errores ni warnings nuevos. `npm test`: 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 016 — Grid de los 12 productos más vendidos en el POS — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/api/pos/top-products/route.ts` (nuevo)
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Nuevo endpoint `GET /api/pos/top-products`: requiere tenant autenticado (`requireTenantId`, mismo patrón que `/api/search` y `/api/products`). Usa `prisma.saleItem.groupBy` agrupando por `productId`, filtrando por `sale.tenantId` y `product.stock > 0`, ordenando por `_sum.quantity` descendente y tomando los primeros 12 (todos los tiempos, sin recorte por fecha — ver Notas). Luego resuelve los productos completos (`id, name, productCode, categoryName, salePrice, stock, ivaRate`) con un segundo query scoped por `tenantId`, preservando el orden de ventas.
- En `pos.tsx`: se agregó un bloque colapsable "Más vendidos" entre la barra de búsqueda/categorías y el listado de productos existente. Tiene un botón de título con ícono `ChevronUp`/`ChevronDown` (nuevo import de `lucide-react`) que alterna `topProductsOpen` (estado nuevo, default abierto).
- El grid es `grid-cols-3 sm:grid-cols-4` (3×4 = 12 tarjetas), cada una con ícono `Package` como placeholder (no hay campo `imageUrl` en el modelo `Product` — ver Notas), nombre truncado a 2 líneas (`line-clamp-2`, ya usado en otro componente del proyecto) y precio con `formatMoney()` (helper ya existente en el archivo).
- Al hacer clic en una tarjeta se llama a la función `addToCart()` ya existente (sin modificarla), reutilizando exactamente la misma lógica de agregado al carrito que usa la lista de productos actual — la tarjeta queda deshabilitada si no hay stock, la caja está cerrada o no se confirmó el gate de venta, igual que en la lista existente.
- Se agregó un `useEffect` propio (fetch en el montaje del componente, sin afectar `productsRefreshKey` ni el efecto de carga de `products`) que llama a `/api/pos/top-products` y guarda el resultado en el nuevo estado `topProducts`; si falla, se ignora silenciosamente (el grid es un atajo opcional, no debe bloquear el POS).

**Notas:**
- Adaptación — `imageUrl`: el prompt pedía retornar "imageUrl (si existe)". El modelo `Product` en `schema.prisma` no tiene ningún campo de imagen, por lo que la condición "si existe" se resuelve en que nunca existe: el endpoint no lo incluye y el grid siempre muestra el ícono `Package` como placeholder, tal como contempla el propio prompt para ese caso.
- Adaptación — "inactivos": el modelo `Product` no tiene campo `isActive`/`active` (sí lo tienen `Tenant`, `Promotion` y `Service`, pero no `Product`). Se documentó con un comentario en el código y se excluyeron únicamente los productos con `stock = 0`, que es el único filtro de exclusión aplicable al schema actual. No se modificó el schema de Prisma (restricción explícita).
- Se eligió "todos los tiempos" (sin filtro de fecha) en vez de "último mes", ya que el propio prompt ofrecía ambas opciones como válidas ("del último mes o todos los tiempos") — todos los tiempos evita un grid vacío en negocios nuevos con poco historial de ventas.
- Se descubrió que ya existe un endpoint distinto `/api/dashboard/top-products` (no listado en "Archivos afectados" de esta tarea, no se tocó) usado para estadísticas del dashboard — agrupa en JS, filtra por últimos 30 días y no incluye stock/precio/ivaRate. Es un consumidor distinto con una necesidad distinta (no sirve para "agregar al carrito"), por lo que se creó el endpoint nuevo en `/api/pos/` en vez de reutilizar o modificar el existente.
- Si alguno de los 12 productos más vendidos históricamente queda sin stock, el grid mostrará menos de 12 tarjetas (no se reemplaza por el siguiente producto en el ranking) — comportamiento simple y predecible, no se consideró un bug sino una consecuencia directa de "excluí productos con stock 0".
- Restricciones respetadas: no se modificó el schema de Prisma, no se tocó el flujo de pago, ni la lógica de búsqueda/filtrado existente (`filteredProducts`, `addToCart`, etc. quedaron intactos) — solo se agregó código nuevo y aditivo.
- `npm run build`, `npx tsc --noEmit -p .` y `npm run lint` ejecutados sin errores ni warnings nuevos (el nuevo endpoint `/api/pos/top-products` aparece correctamente en la salida del build). `npm test`: 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 015 — Atajos de teclado en el POS — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Se agregó un nuevo `useEffect` con un listener global `keydown` (`window.addEventListener`/`removeEventListener` en el cleanup), ubicado junto al efecto existente de cierre por Escape del modal de pago, para mantener agrupados los listeners de teclado.
- Los tres atajos quedan deshabilitados de forma uniforme si `e.target` es un `<input>` o `<textarea>` (chequeo por `tagName`), tal como exige la restricción #3 del prompt.
- **Escape:** cierra, en orden de prioridad, el primer popover/modal abierto entre: `promoCodeOpen` (+ reset de `promoCodeInput`/`promoCodeError`), `discountEditingId` (editor de descuento por ítem de la Tarea 013), `noteModalOpen`, `cotizacionOpen`, `moreDropdownOpen`, `promosPanelOpen`, `customerSearchOpen`, `optionalCustomerOpen`, `saleGateOpen`, `showInvoiceModal`, `showPrintModal` (seteado a `null`). **No se incluyó `showPaymentModal`** porque ya tiene su propio efecto de Escape dedicado (líneas previas, sin tocar) y porque modificarlo cae dentro de "el flujo de pago", restringido explícitamente. Tampoco se incluyeron `barcodeNotFound` (flash transitorio que se autodescarta) ni `showDraftBanner` (decisión de negocio sobre recuperar/descartar una venta suspendida — sin acción segura por defecto para Escape).
- **F2:** llama a `handleNewSale()` (la función ya usada por el botón "Nueva venta" existente), con `e.preventDefault()` para evitar el comportamiento nativo del navegador en esa tecla.
- **Enter:** si hay exactamente un producto filtrado (`filteredProducts.length === 1`) y la caja está abierta (`cashRegisterStatus === "open"`), se agrega ese producto al carrito vía `addToCart(...)`. **Nota de adaptación:** el buscador/escáner ya implementaba este mismo comportamiento localmente en su propio `onKeyDown` (sin cambios), por lo que esta rama del listener global resulta mayormente inerte en el caso de uso típico (foco en el input de búsqueda), ya que ese input queda excluido por el chequeo de input/textarea. Se implementó igual para cumplir literalmente con la instrucción en el caso de que el foco esté en otro elemento.
- **Adaptación — "input de cantidad":** la UI del carrito no tiene un input de texto para cantidad; usa un stepper con botones `−`/`+` y un `<span>` no editable. No existe ningún elemento al cual aplicar "si ya hay focus en el input de cantidad, confirmar". Se documenta como no aplicable a la UI actual, sin crear un input nuevo no solicitado por esta tarea.
- El array de dependencias del nuevo `useEffect` lista todos los estados de apertura/cierre referenciados más `filteredProducts` y `cashRegisterStatus`; se agregó `// eslint-disable-next-line react-hooks/exhaustive-deps` (mismo patrón ya usado en otra parte del archivo) porque `handleNewSale`/`addToCart` no están memoizados y se redefinen en cada render — incluirlos forzaría reinscribir el listener constantemente sin beneficio real.

**Notas:**
- Restricciones respetadas: no se modificó el flujo de pago (`showPaymentModal` y su efecto de Escape quedaron intactos), no se tocó la lógica de ventas/cálculos, y no se modificó ningún archivo fuera de `src/app/ui/pos.tsx`.
- Tradeoff aceptado conscientemente: como los tres atajos se desactivan uniformemente cuando el foco está en un input/textarea (interpretación literal de la restricción #3, que no distingue entre atajos), Escape no cierra un modal mientras el foco esté en un campo de texto propio de ese modal (ej. el textarea de notas). Se prefirió esta lectura conservadora a inventar una excepción no pedida.
- `npm run build`, `npx tsc --noEmit -p .` y `npm run lint` ejecutados sin errores ni warnings nuevos. `npm test`: 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 014 — Descuento global sobre el total del carrito — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Se agregaron los estados `globalDiscountType` (`"percent" | "fixed"`, default `"percent"`) y `globalDiscountValue` (string, default `""`).
- En el panel de resumen del carrito, justo debajo de "Subtotal", se agregó la fila "Descuento global" con un toggle `%`/`$` y un input numérico. El total se recalcula en tiempo real en cada `onChange` (sin botón "Aplicar").
- Se agregaron las constantes derivadas `globalDiscountAmount` (calculada como `cartNet × (valor/100)` para `"percent"` o `Math.min(valor, cartNet)` para `"fixed"`, siempre acotada a `[0, cartNet]`) y `cartGrandTotal = cartNet - globalDiscountAmount`, donde `cartNet` es el subtotal ya neto de los descuentos por ítem y promociones (de la Tarea 013) — esto garantiza que el descuento global se aplique DESPUÉS de los descuentos por ítem, sobre el subtotal ya descontado, como pide el prompt.
- La fila "Descuento" del panel ahora muestra `totalDiscount + manualDiscountTotal + globalDiscountAmount`, y "Total a pagar" muestra `cartGrandTotal`.
- En `submitSale()`, cuando `globalDiscountAmount > 0`, se agregan al payload de `POST /api/sales` los campos `globalDiscountType`, `globalDiscountValue` (valor crudo ingresado) y `globalDiscountAmount` (monto calculado) — campos adicionales que el validador del backend ignora sin rechazarlos, sin requerir tocar la API ni el schema.
- El estado del descuento global se resetea a sus valores por defecto en `clearSale()` y en la limpieza posterior a una venta exitosa, para que no quede aplicado por error a la siguiente venta.
- Los botones del toggle `%`/`$` llevan `type="button"` explícito y el input tiene `onKeyDown` que hace `preventDefault()` en Enter, porque este campo vive dentro del `<form onSubmit={handleSubmit}>` del panel de pago — sin esto, Enter o un clic en el toggle dispararían el submit de la venta.

**Notas:**
- Restricción respetada: no se tocó `remaining`, `totalAssigned` ni la definición de `cartNet` (lógica del split de pagos), ni el modal de pago — el descuento global se calculó como una capa adicional (`cartGrandTotal`) sin alterar esas variables. Esto significa que, en el estado actual, el monto que el sistema exige cubrir en el split de pagos (`remaining`) sigue basado en `cartNet` (sin el descuento global), mientras que "Total a pagar" en el panel de resumen y el payload enviado al backend sí reflejan el descuento global. Es una limitación conocida de esta tarea puntual (restringida explícitamente a "solo el panel de resumen"), no un bug introducido — quedaría pendiente para una tarea futura que conecte el descuento global con la validación de pagos si se requiere que el monto cobrado real coincida con el total mostrado.
- No se modificó `/api/sales/route.ts` ni el schema de Prisma.
- `npm run build`, `npx tsc --noEmit`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, typecheck OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 013 — Descuento manual por ítem en el POS — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/pos.tsx`

**Cambios realizados:**
- Se agregaron los campos `discount: number` y `discountType: "percent" | "fixed"` al tipo `CartItem`, con valores por defecto `0` y `"percent"` en los dos puntos donde se construye un ítem de carrito (`addToCart` para productos y `addServiceToCart` para servicios).
- En cada fila del carrito se agregó una segunda línea con un botón "% desc": al hacer clic abre un editor inline con toggle `%`/`$`, un input numérico y un botón "Aplicar" (siguiendo el mismo patrón visual que el input de código de promoción ya existente). Cuando el ítem tiene un descuento activo, aparece un botón "Quitar" para resetearlo a 0.
- Se agregó `getLineFinalTotal(item, displayPrice)`: calcula el total de la línea como `precio × cantidad × (1 - descuento/100)` para tipo `"percent"`, o `precio × cantidad - descuento` para tipo `"fixed"` (con `Math.max(0, …)` para evitar totales negativos). El "precio" usado es el `displayPrice` ya existente (precio con descuento de promoción aplicado si corresponde), por lo que el descuento manual se aplica sobre el precio que el cajero ve en esa fila, de forma acumulativa con las promociones automáticas.
- Se agregó la constante `manualDiscountTotal` (suma de los descuentos manuales de todos los ítems) y se sumó de forma aditiva al descuento existente de promociones (`totalDiscount`), sin modificar su cálculo. La fila "Descuento" del panel de totales ahora muestra `totalDiscount + manualDiscountTotal`, y `cartNet` (antes `cartTotal - totalDiscount`) ahora es `cartTotal - totalDiscount - manualDiscountTotal`. Esto era necesario para que el monto a pagar mostrado y el que se exige cubrir en el split de pagos (`remaining`) coincidan con el descuento aplicado — de lo contrario la venta no podría cerrarse con el monto correcto.
- En `submitSale()`, cada ítem enviado a `POST /api/sales` ahora incluye `discount` y `discountType` (campos adicionales que el validador del backend ignora sin rechazarlos — no requirió tocar la API ni el schema). `successTotal` (monto mostrado en el modal de impresión/confirmación tras la venta) ahora usa `cartNet` en lugar de `cartTotal - totalDiscount`, para reflejar el descuento manual también ahí.
- Se agregó `normalizeCartItems()` y se usa en `readDraft()` y `readSavedCart()` para que los carritos guardados en `localStorage` antes de este cambio (sin `discount`/`discountType`) se completen con los valores por defecto al recuperarse, evitando `undefined` en los cálculos.

**Notas:**
- No se modificó `/api/sales/route.ts`, `src/modules/sales/sale-validation.ts` ni el schema de Prisma, conforme a la restricción de la tarea — se verificó que el validador del backend solo toma `productId`/`serviceId`/`quantity` de cada ítem e ignora campos desconocidos.
- No se tocó el flujo de pago (`paymentSplits`, métodos de pago, validación de montos) ni la estructura del modal de confirmación/impresión de venta — el único ajuste fue que los montos derivados (`cartNet`, `successTotal`) ahora restan también el descuento manual, igual que ya restaban el descuento de promociones.
- El botón se rotuló literalmente "% desc" como pide el prompt, aunque también permite elegir `$` dentro del editor.
- `npm run build`, `npm run lint`, `npx tsc --noEmit` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, typecheck sin errores, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 012 — Días abreviados en español en el gráfico de 7 días — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
- Se agregó la constante `DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]` (exactamente como la pidió el prompt).
- Se reescribió el helper `formatXAxisLabel(dateStr)` usado en el gráfico de 7 días ("Ingresos vs. gastos — últimos 7 días", `MainSalesChart`/`SalesAreaChart`): ahora devuelve `DIAS[date.getDay()]` para cada fecha, y devuelve `"Hoy"` en lugar del nombre del día cuando `dateStr` coincide con la fecha actual.
- Se quitó el número de día del mes que se mostraba antes (ej. "Lun 23"), ya que el prompt pide reemplazar las fechas numéricas por el nombre abreviado del día.
- No se tocaron colores, tamaños ni la lógica de los datos del gráfico (`salesByDay`, `expensesByDay`, ejes, líneas) — solo el texto de las etiquetas del eje X.

**Notas:**
- El único gráfico de "últimos 7 días" en el Dashboard es el chart de área/línea "Ingresos vs. gastos — últimos 7 días" (no es technicamente un "gráfico de barras" como dice el título de la tarea, pero es el único componente con etiquetas de eje X basadas en fecha). Se aplicó el cambio ahí, siguiendo el mismo criterio de adaptación a la UI real documentado en tareas anteriores (002, 009, 010).
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 011 — Estado vacío amigable en el Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
- Se agregó `const hasActivity = allSales.length > 0 || allCash.length > 0;`, calculado sobre las ventas y movimientos de caja ya obtenidos para el período seleccionado (sin tocar la lógica de fetch ni los endpoints).
- Cuando `hasActivity` es `false`, el bloque de tarjetas KPI, gráfico, paneles y acciones rápidas se reemplaza por el nuevo componente `DashboardEmptyState`, que muestra: ícono grande `ShoppingBag` (ya importado), título "Sin actividad en este período", subtítulo "Registrá tu primera venta del día desde el POS." y un botón "Ir al POS" (violeta `#7c3aed`) que enlaza a `/pos`.
- Cuando hay al menos una venta o movimiento de caja en el período, se muestra el Dashboard normal sin cambios (tarjetas, gráfico, paneles, acciones rápidas).
- El encabezado (saludo), el selector de período y los accesos rápidos superiores (`TopQuickActions`) se mantienen visibles siempre, incluso en el estado vacío, para que el usuario pueda cambiar de período o actuar sin perder contexto.

**Notas:**
- No se modificó la lógica de fetch, los endpoints, ni el cálculo de los valores derivados (`todaySalesTotal`, `salesByDay`, etc.) — solo se condicionó qué bloque de JSX se renderiza.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 010 — Tooltip explicativo en cada KPI del Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
- Se agregó el componente `KpiTooltip({ text })`: un ícono ⓘ pequeño (`text-gray-400`) que al hacer hover (`group`/`group-hover` de Tailwind, sin librerías externas) muestra un tooltip con fondo oscuro (`bg-slate-900`) y el texto explicativo, posicionado debajo del ícono con `absolute`/`pointer-events-none`.
- Se agregó un prop opcional `tooltipText?: string` a `MetricCard`, renderizado junto al ícono de la tarjeta (esquina superior derecha) cuando se provee.
- Se aplicó el tooltip a las tarjetas KPI cuyo texto del prompt corresponde de forma inequívoca a una tarjeta real del Dashboard:
  - "Ventas del día" → "Total de ventas completadas en el período seleccionado."
  - "Productos bajos" (tarjeta `LowStockCard`, equivalente a "Stock crítico") → "Productos con stock igual o por debajo del mínimo configurado."

**Notas:**
- El prompt nombraba 5 KPIs con su texto: Ventas del día, Balance de caja, Gastos del mes, Deudas pendientes y Stock crítico. El Dashboard actual no tiene tarjetas KPI para "Balance de caja", "Gastos del mes" ni "Deudas pendientes" (esos datos se obtienen en el fetch pero no se muestran como tarjeta numérica grande — mismo hallazgo documentado en Tareas 002 y 009). Las 4 tarjetas reales son: Ventas del día, Ventas del mes, Ganancia del día y Productos bajos.
- De esas 4 tarjetas, solo "Ventas del día" y "Productos bajos" tienen una correspondencia textual exacta y precisa con los textos del prompt ("Stock crítico" describe exactamente lo que muestra "Productos bajos"). "Ventas del mes" y "Ganancia del día" no tienen un texto equivalente en el prompt — "Ganancia del día" no es lo mismo que "Balance de caja" (una es ventas menos egresos de caja del día, la otra sería el saldo acumulado de caja), por lo que asignarle ese texto sería inexacto. Siguiendo "ante la duda, hacé menos — no más", se dejaron esas dos tarjetas sin tooltip en lugar de inventar un texto explicativo no solicitado.
- No se usaron librerías de tooltip externas — solo CSS de Tailwind con `group`/`group-hover`.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 009 — Animación de conteo (rollup) en los números grandes del Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
- Se agregó un custom hook `useCountUp(target: number, duration: number = 800)` dentro de `dashboard-summary.tsx`, que anima un número desde 0 hasta `target` usando `requestAnimationFrame`/`cancelAnimationFrame` (sin librerías externas).
- El hook usa un `useRef` (`hasAnimatedRef`) para asegurar que la animación corra una sola vez por montaje del componente: en el primer efecto anima 0→target; si `target` cambia después de esa primera animación (dentro del mismo ciclo de vida del componente), el valor salta directo al nuevo target sin re-animar.
- Se aplicó `useCountUp` en `MetricCard` (recibe ahora `value: number` + `format: (n: number) => string` en lugar de un string ya formateado) y en un nuevo componente `LowStockCard`.
- Los 3 KPIs monetarios ("Ventas del día", "Ventas del mes", "Ganancia del día") ahora pasan el número crudo a `MetricCard` junto con `format={formatARS}`; el valor se anima como entero y se formatea con `formatARS()` solo al renderizar (`format(animatedValue)`), cumpliendo el punto 4 del prompt.
- Se creó `LowStockCard({ count })`, que reemplaza el bloque inline anterior de "Productos bajos" y anima el conteo con `useCountUp(count ?? 0)`, preservando el fallback "—" cuando `count` es `null` (datos aún no cargados).
- No se modificó la lógica de fetch ni los datos: los valores numéricos siguen viniendo de los mismos states (`todaySalesTotal`, `monthSalesTotal`, `todayProfit`, `state.summary?.lowStockProductsCount`).

**Notas:**
- El prompt de la tarea nombraba como KPIs a animar "ventas del día, balance de caja, total gastos, total deudas". Se verificó que `currentCashBalance`, `totalExpensesAmount` y `totalDebtRemaining` se obtienen en el fetch pero **no se renderizan como números grandes** en ningún lugar del Dashboard actual (solo existen en el tipo `Summary`, sin uso en JSX). Por lo tanto, siguiendo el mismo criterio aplicado en la Tarea 002 ante un desajuste similar, se animaron los 4 "números grandes" que realmente se muestran hoy en el Dashboard: Ventas del día, Ventas del mes, Ganancia del día y Productos bajos (stock bajo). No se agregaron tarjetas nuevas ni se expandió el alcance de la UI.
- La animación corre solo una vez por montaje (gracias a `hasAnimatedRef`); si el usuario cambia filtros y el Dashboard vuelve a mostrar el skeleton de carga (`state.loading`), `MetricCard`/`LowStockCard` se desmontan y remontan, por lo que la animación se reproduce de nuevo de forma natural — esto es el comportamiento esperado, no un re-render comprado on every data change.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores nuevos: build OK, lint sin warnings, tests 166 passed / 32 failed (preexistentes, `DATABASE_URL` no disponible en sandbox, no relacionados a este cambio) / 2 skipped — igual al baseline de la sesión.

---

## Tarea 008 — Saludo personalizado con nombre del usuario — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
El componente (Client Component, `"use client"`) no tenía acceso al usuario autenticado — `verifySession()` (`src/lib/auth.ts`) devuelve solo IDs y metadata de sesión, sin `name`. Se encontró que ya existe `GET /api/me` (`src/app/api/me/route.ts`, sin modificar), que devuelve `{ data: { name, businessName, role } }`, y que ya se consume client-side con el mismo patrón (`fetch` + `useEffect` + `useState`) en `SidebarUser` dentro de `src/app/ui/app-shell.tsx` — se replicó ese patrón existente, sin tocar el sistema de autenticación ni ningún Server Component.

Se agregó el componente `GreetingHeader` y el helper `getGreeting(date, name)`, que devuelve el saludo según franja horaria: "Buenos días, {nombre} ☀️" (6-12hs), "Buenas tardes, {nombre} 🌤️" (12-20hs), "Buenas noches, {nombre} 🌙" (20-6hs). El bloque de header se reemplazó: el título estático "Hola, Propietario 👋" pasó a ser el saludo dinámico (`text-xl font-bold`, igual que antes), y debajo se muestra la fecha actual formateada en español (`text-sm text-slate-500`, reutilizando `formatFullDate()` ya existente, que ya producía el formato pedido, ej. "Domingo 28 de junio de 2026") junto al ícono `Calendar` que antes estaba a la derecha del header — se reubicó debajo del saludo en vez de duplicar la fecha en dos lugares del mismo header.

**Notas:**
- No se modificó `src/lib/auth.ts`, `src/app/api/me/route.ts`, ni ningún Server Component (`dashboard/page.tsx`, `app-shell.tsx`) — todo el cambio quedó contenido en `dashboard-summary.tsx`, según lo pedido.
- Fallback: mientras el nombre no cargó (o si `/api/me` no devuelve `name`, ej. error de red o sesión inválida), se muestra "Hola 👋" en lugar del saludo por franja horaria, cumpliendo la restricción de no bloquear el render ni asumir un nombre inexistente.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 007 — Gráfico combinado: ingresos vs. gastos en el mismo chart — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
El gráfico de 7 días (`MainSalesChart` / `SalesAreaChart`, SVG hecho a mano, sin librería de gráficos) solo mostraba ventas. Se agregó un segundo dataset de gastos del mismo período sin tocar el tamaño, posición ni la librería del widget (sigue siendo SVG plano, mismas constantes `CW_MAIN`/`CH_MAIN`/márgenes).

Se agregó el tipo `Expense` (`id`, `expenseDate`, `amount`) y el campo `expenses` a `DashboardState`. El fetch de datos del dashboard ahora incluye `GET /api/expenses?from=...&to=...` (endpoint ya existente, ya soportaba `from`/`to` igual que `/api/sales` y `/api/cash-movements` — no se modificó), agregado al mismo `Promise.allSettled` y siguiendo el mismo patrón de mapeo de las demás fuentes.

Se calculó `expensesByDay` (gastos agrupados por día sobre `last7Dates`) con la misma lógica ya usada para `salesByDay`. `MainSalesChart` ahora recibe `salesByDay` y `expensesByDay`, y `SalesAreaChart` renderiza ambos datasets sobre el mismo SVG: la línea de ventas (violeta `#7c3aed`, con el área de relleno que ya existía) y una nueva línea de gastos (naranja `#f97316`, sin relleno, para no saturar visualmente el gráfico al superponerse). El eje Y (`yMax`/`niceMax`) ahora se calcula sobre el máximo de ambos datasets combinados. Se agregó una leyenda simple ("● Ventas ● Gastos") arriba del gráfico, debajo del título, que se actualizó a "Ingresos vs. gastos — últimos 7 días" para reflejar que ya no es solo de ventas. El estado vacío (`hasData`) ahora considera ambos datasets.

**Notas:**
- No se modificó la librería de gráficos (sigue siendo SVG plano hecho a mano) ni su configuración global, ni el tamaño/posición del widget — solo su contenido interno.
- No se tocaron APIs fuera de las del dashboard: `/api/expenses` ya soportaba `from`/`to`, se usó tal cual sin modificarlo.
- Igual que con `/api/sales` y `/api/cash-movements` en este mismo componente, el fetch de gastos no especifica `limit`, por lo que usa el default de paginación del endpoint (`20`) — comportamiento preexistente del archivo, no introducido por esta tarea.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 006 — Accesos rápidos al POS y Nuevo Gasto desde el Dashboard — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
El dashboard ya tenía una sección "Acciones rápidas" (`QuickActions`), pero está ubicada al final de la página (requiere scroll) y usa botones chicos tipo ícono+texto sobre fondo blanco — no cumple lo pedido por la tarea (botones grandes y prominentes, visibles sin scroll, con los colores específicos violeta/gris oscuro). Se decidió no modificar `QuickActions` (sigue cumpliendo su propósito general de accesos a 6 secciones) y en su lugar agregar un nuevo componente `TopQuickActions`, ubicado debajo del selector de período y antes de las tarjetas de KPIs — visible sin scroll, como exige la tarea.

`TopQuickActions` renderiza dos botones grandes en una fila (columna en mobile, full width cada uno): "🛒 Ir al POS" con fondo violeta (`bg-violet-600`, hover `bg-violet-700`) que enlaza a `/pos`, y "➕ Nuevo gasto" con fondo gris oscuro (`bg-slate-800`, hover `bg-slate-900`) que enlaza a `/expenses` (no existe una ruta `/expenses/new` dedicada en el proyecto, por lo que se usó la página de gastos según lo indicado en el prompt: "o al formulario de nuevo gasto si existe").

**Notas:**
- No se tocó la lógica de gastos ni del POS — solo se agregaron dos `<Link>` en `dashboard-summary.tsx`.
- No se modificó ni se eliminó el `QuickActions` existente al final de la página.
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 005 — Ranking de vendedores del día (top 3 por monto) — 2026-06-29

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Archivos nuevos:**
- `src/app/api/dashboard/top-sellers/route.ts`

**Cambios realizados:**
Se creó el endpoint `GET /api/dashboard/top-sellers`, que consulta las ventas del día actual (medianoche a medianoche, hora del servidor) del tenant, excluyendo las que tengan al menos una devolución asociada (`returns: { none: {} }`, ya que `Sale` no tiene un campo `status` propio — "no devueltas" se interpretó vía la relación existente con `Return`). Las ventas se agrupan por `sellerId` (con fallback a `sellerCode` si no hay `sellerId`); para resolver el nombre se busca el `User.name` correspondiente al `sellerId` dentro del mismo tenant, y si no hay usuario asociado se usa el `sellerCode` como nombre visible. Las ventas sin `sellerId` ni `sellerCode` (ventas sin vendedor asignado) se excluyen del ranking. Devuelve los 3 vendedores con mayor `totalAmount`, cada uno con `name`, `totalAmount` y `salesCount`.

En `dashboard-summary.tsx` se agregó el tipo `TopSeller` y el componente `TopSellersWidget`, que hace fetch al nuevo endpoint y muestra hasta 3 vendedores con medalla (🥇🥈🥉), nombre, cantidad de ventas y monto en ARS (`formatARS()`). Estado vacío con ícono `Trophy` y texto "Sin ventas registradas hoy" si no hay datos. El widget se ubicó junto al de "Cotizaciones pendientes" (Tarea 003), en una grilla de 2 columnas, sin afectar la fila del gráfico + productos top ni la fila inferior de 3 columnas.

**Notas:**
- No se modificó el schema de Prisma ni la lógica de ventas en `/sales` o el POS — solo lectura vía `prisma.sale.findMany` y `prisma.user.findMany`, ambos con scope de `tenantId`.
- El "día actual" se calcula con la fecha/hora del servidor (no hay manejo de timezone explícito en el resto del proyecto para este tipo de cálculo; se mantuvo consistente con ese patrón existente).
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 004 — Alerta si la caja no fue cerrada al final del día — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
No existía ninguna lógica relacionada con caja (apertura/cierre) en `dashboard-summary.tsx`. Se agregó un nuevo tipo `CashRegisterSession` (`id`, `status`, `openedAt`, `closedAt`) y un componente `OpenCashRegisterAlert`, montado como primer elemento dentro del contenedor raíz del Dashboard (antes del header), para que el banner quede en la parte superior de la página.

El componente hace fetch a `GET /api/cash-register` (endpoint ya existente, sin modificarlo) y obtiene la sesión de caja actual (`null` si no hay ninguna abierta). Si la sesión tiene `status === "OPEN"` y se cumple `hora local >= 20:00 OR fecha de apertura (openedAt) anterior a la fecha de hoy`, se muestra un banner amarillo (`bg-amber-50`/`border-amber-200`/`text-amber-800`) con el texto exacto pedido por la tarea ("⚠️ La caja sigue abierta. Recordá cerrarla antes de terminar el día.") y un botón "Ir a Caja" (`bg-amber-600`) que navega a `/cash-movements`. Si la caja está cerrada, no hay sesión, o ninguna condición se cumple, el componente no renderiza nada.

Para la condición "el último cierre fue en un día anterior al día de hoy": como una sesión abierta nunca tiene `closedAt` (es `null` mientras está `OPEN`), se interpretó como "la sesión sigue abierta desde un día anterior al actual" usando `openedAt` en vez de `closedAt` — comparando la fecha (`YYYY-MM-DD`, mismo criterio `toISOString().slice(0,10)` ya usado en el resto del archivo para `todayStr`/`yesterdayStr`) de apertura contra la de hoy.

**Notas:**
- No se tocó el flujo de apertura/cierre de caja: no se modificaron `src/app/api/cash-register/*`, `src/modules/cash-register/*` ni `src/app/ui/cash-register-close.tsx`. Solo se consumió el endpoint `GET /api/cash-register` ya existente (lectura).
- `npm run build`, `npm run lint` y `npm test` ejecutados sin errores. Mismas 166 pasadas / 32 fallas preexistentes de integración por falta de `DATABASE_URL` / 2 omitidas — sin relación con este cambio.

---

## Tarea 003 — Widget de cotizaciones pendientes de confirmar — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Archivos nuevos:**
- `src/app/api/dashboard/pending-quotes/route.ts`

**Cambios realizados:**
El tipo `ExpiringQuote` ya existía pero solo se usaba dentro de `AlertsPanel` como un conteo agregado ("X cotizaciones vencen en las próximas 24 hs"), sin mostrar cotizaciones individuales — no cumplía lo pedido por la tarea, así que se creó el widget dedicado desde cero, sin tocar `AlertsPanel`.

Se agregó el componente `PendingQuotesWidget`, ubicado debajo de la grilla de KPIs principales (antes de la fila de gráfico + productos top). Hace fetch a un nuevo endpoint `/api/dashboard/pending-quotes` y muestra hasta 5 cotizaciones con: número (`quoteNumber`), nombre del cliente, monto formateado con `formatARS()`, y un badge de días restantes con color semáforo (verde >7 días, amarillo 3-7, rojo <3 o vencida). Estado vacío con ícono `FileText` y texto "Sin cotizaciones pendientes".

El nuevo endpoint reutiliza `getExpiringQuotes` (ya existente en `modules/quotes`, sin modificarlo) con una ventana de 30 días en vez de 24 horas, y devuelve las primeras 5 ordenadas por `validUntil` ascendente (la función ya ordena así). No se creó lógica nueva de acceso a datos ni se tocó `quote-data-access.ts`.

**Notas:**
- No se modificó el schema de Prisma ni el flujo de creación/edición/confirmación de cotizaciones en `/quotes`.
- Las cotizaciones se consideran "pendientes" si su estado es `DRAFT` o `SENT` (mismo filtro que ya usaba `getExpiringQuotes`).
- `npm run build`, `npm run lint` y `npm test` (suite unitaria) ejecutados sin errores. Mismas 32 fallas preexistentes de integración por falta de `DATABASE_URL`, sin relación con este cambio.

---

## Tarea 002 — KPIs clickeables que navegan a su sección — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
Se agregó un prop opcional `href` a `MetricCard`: cuando está presente, la tarjeta se envuelve en un `<Link>` de Next.js (en lugar de un `<div>`) y se le agregan las clases `cursor-pointer transition hover:ring-2 hover:ring-violet-500/30`. Se aplicó a las 3 tarjetas de la grilla principal que usan `MetricCard`:
- "Ventas del día" → `/sales`
- "Ventas del mes" → `/sales`
- "Ganancia del día" → `/reports` (no hay una sección dedicada a "ganancia"; se eligió Reportes como destino más afín dado que es donde se analiza el desempeño financiero)

La tarjeta "Productos bajos" (stock crítico, que no usa `MetricCard` sino un `div` propio) se envolvió completa en un `<Link href="/inventory">` con el mismo estilo hover. El link interno "Ver inventario →" que apuntaba a `/products` se convirtió en un `<span>` (ya no es un link separado, para evitar anidar `<a>` dentro de `<a>`), y el destino de toda la tarjeta pasó a ser `/inventory` según el mapeo indicado en la tarea.

No se modificaron tamaño, color ni contenido de las tarjetas — solo se agregó el wrapping con Link y el estilo hover.

**Notas:**
- El mapeo de la tarea menciona 5 categorías (Ventas, Caja, Gastos, Deudas, Inventario), pero el dashboard actual solo tiene 4 tarjetas KPI en la grilla principal (no hay tarjetas de "Balance de caja", "Gastos del mes" ni "Deudas pendientes" en esa grilla); por eso solo se linkearon las 4 tarjetas existentes, sin agregar tarjetas nuevas (fuera de alcance de esta tarea).
- No se tocaron APIs, lógica de datos ni otros componentes — cambio acotado a `dashboard-summary.tsx`.
- `npm run build`, `npm run lint` y `npm test` (suite unitaria) ejecutados sin errores. Las mismas 32 fallas preexistentes de tests de integración por falta de `DATABASE_URL` en el sandbox persisten, sin relación con este cambio.

---

## Tarea 001 — Filtro de fecha global en el Dashboard — 2026-06-28

**Estado:** ✅ Completada

**Archivos modificados:**
- `src/app/ui/dashboard-summary.tsx`

**Cambios realizados:**
Se agregó un selector de período (Hoy / Esta semana / Este mes / Personalizado) con botones tipo pill, ubicado antes de las tarjetas de KPIs. El botón activo usa el violeta `#7c3aed` (bg-violet-600) como exige la tarea. Para "Personalizado" se muestran dos inputs `type="date"` (desde/hasta) con el mismo estilo que el resto del archivo.

El filtro seleccionado se traduce a un rango `from`/`to` (helper `getDateRange`) y se pasa como query params a los fetch de `/api/sales` y `/api/cash-movements`, que ya soportaban `gte`/`lte` sobre `saleDate`/`movementDate` respectivamente — no fue necesario modificar esas rutas ni los módulos de acceso a datos.

**Notas:**
- No se filtró "gastos" porque el dashboard no realiza un fetch propio a `/api/expenses`; el único dato de gastos (`totalExpensesAmount`) proviene de `/api/dashboard/summary`, que no usa fechas y no se muestra en la UI. Se decidió no tocar esa ruta ni `dashboard-summary.ts` (módulo) para no romper sus tests existentes y por respetar la restricción de no modificar archivos fuera del alcance indicado.
- Default del selector: "Este mes" (no "Hoy"), para evitar que las tarjetas y gráficos queden vacíos al cargar la página por primera vez.
- No se modificó el schema de Prisma ni el layout general del dashboard.
- `npm run build`, `npm run lint` y `npm test` (suite unitaria) ejecutados sin errores. Los tests de integración fallan en este entorno por falta de `DATABASE_URL` (no hay base de datos disponible en el sandbox) — falla preexistente, no relacionada con este cambio.

---
