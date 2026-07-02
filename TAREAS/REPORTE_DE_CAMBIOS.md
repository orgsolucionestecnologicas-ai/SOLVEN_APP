# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

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
