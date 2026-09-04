# RET-UX-02 — Flujo de devolución unificado + limpieza de POS

> Rama: `design/revision-uiux-sep-2026` (continuación de RET-UX-01 / PROD-UX-01 / CAJA-UX-01, ya mergeados en esta rama). Diego revisó el preview de Vercel de esta rama y pidió estos 4 ajustes puntuales. Investigación de código ya hecha por el Ingeniero Líder — las referencias de archivo/línea de abajo están verificadas contra el HEAD actual de la rama (commit `d87af33`), pero pueden haberse movido unas líneas si tocaste algo antes de llegar a esta sección.

**No tocar:** nada de Cotizaciones, Reportes, Ajustes, ni el ticket de papel térmico (sigue fuera de alcance). No tocar `src/lib/arca/*`.

---

## Sección 1 — Sacar "Más vendidos" del POS

En `src/app/ui/pos.tsx`, la vista de Venta actual (navegación por categorías) tiene un bloque colapsable "Más vendidos" arriba de la grilla de productos. Diego pidió sacarlo — lo demás de la navegación por categorías se queda igual.

Remover:
1. El bloque JSX completo `{/* Más vendidos */} {!topProductsLoading && topProducts.length > 0 ? (...) : null}` (aprox. líneas 1723–1759).
2. Los 3 `useState` que solo alimentan ese bloque: `topProducts`, `topProductsLoading`, `topProductsOpen` (aprox. líneas 369–371).
3. El `useEffect` que hace `fetch("/api/pos/top-products")` y llena esos states (aprox. líneas 640–664).

**No tocar** el endpoint `src/app/api/pos/top-products/route.ts` — queda sin usar, pero borrarlo no es necesario y agrega riesgo innecesario para este cambio. Confirmá con `grep -rn "pos/top-products"` que no quede ninguna otra referencia rota antes de dar esto por terminado.

`ChevronUp`/`ChevronDown` de `lucide-react` se siguen usando en otros lugares de `pos.tsx` (línea ~2760 y ~3275) — no toques esos imports.

---

## Sección 2 — Unificar "Devolver" desde Historial de ventas con el formulario real de Devoluciones

Hoy hay **dos formularios de devolución distintos** en la app:

- El bueno: `Returns()` en `src/app/ui/returns.tsx` (tab "Devoluciones" del POS) — búsqueda por chips, motivo, método de reintegro, etc.
- El viejo: `ReturnModal` dentro de `src/app/ui/sales-list.tsx` (líneas ~715–900) — se abre cuando en el Historial de ventas el usuario aprieta el botón "Devolver" (`RotateCcw` + texto "Devolver", al lado de "Imprimir", línea ~505-510 de `sales-list.tsx`). Es un modal aparte, con su propia selección de ítems y solo dos opciones de reintegro ("Efectivo"/"Crédito a cuenta"), y pega directo a `POST /api/returns` sin pasar por ninguna de las reglas de negocio que sí tiene el formulario bueno (motivo obligatorio, validación de método según cómo se pagó, etc.).

Diego dijo explícitamente: le gusta el botón "Devolver" ahí al lado de "Imprimir" (dejalo donde está), pero al apretarlo tiene que llevarlo **al mismo formulario que usa la pestaña Devoluciones, con la venta ya preseleccionada** — no abrir el modal viejo.

`SalesList` y `Returns` son hermanos, renderizados condicionalmente dentro del mismo componente padre `pos.tsx` según su estado `activeTab` (`"Venta actual" | "Historial" | "Devoluciones"`, ver línea ~1552-1556 de `pos.tsx`). Como comparten padre, no hace falta routing ni query params — alcanza con levantar un pedacito de estado a `pos.tsx`:

1. En `pos.tsx`: agregar `const [returnPresetSale, setReturnPresetSale] = useState<SaleRecord | null>(null);` (o el tipo que corresponda — ver punto de atención abajo). Pasarle a `<SalesList>` una nueva prop, ej. `onReturnRequest={(sale) => { setReturnPresetSale(sale); setActiveTab("Devoluciones"); }}`, y a `<Returns>` una prop `presetSale={returnPresetSale}` + `onPresetConsumed={() => setReturnPresetSale(null)}`.

2. En `sales-list.tsx`: **borrar por completo** el componente `ReturnModal` (líneas ~715–913 aprox., incluyendo el render `<ReturnModal sale={returningSale} ... />` cerca de la línea 375 y el estado `returningSale`/`setReturningSale`). El botón "Devolver" de `SaleCard` (línea ~505) pasa a llamar la nueva prop `onReturnRequest(sale)` en vez de `onReturn(sale)` → `setReturningSale`. Revisá que no quede código muerto (tipos `ReturnItemState`, `ReturnResponse`, etc. que solo usaba el modal viejo).

3. En `returns.tsx`: el componente `Returns()` acepta las nuevas props opcionales (`presetSale`, `onPresetConsumed`). Con un `useEffect` sobre `presetSale`: si viene con valor, llamar `handleSelectSale(presetSale)` (la función ya existe, línea ~241) y asegurar que el tab interno de Devoluciones (`activeTab` local de `Returns`, distinto del de `pos.tsx` — ojo con el nombre repetido) quede en `"new"` (no en `"history"`). Después, llamar `onPresetConsumed?.()` para no re-disparar la preselección si el usuario vuelve a entrar manualmente a la pestaña más tarde.

**Punto de atención — no asumir, verificar vos:** `sales-list.tsx` usa un tipo `SaleRecord` para las ventas, y `returns.tsx` usa su propio tipo `Sale` para las suyas (cada archivo lo define/importa por su cuenta). Antes de tipar el estado levantado a `pos.tsx`, confirmá si son estructuralmente compatibles (mismos campos que usa `handleSelectSale`/`ReturnHistoryPanel`) o si hace falta un adaptador o un fetch a `/api/sales/{id}` con el tipo `Sale` de `returns.tsx` para no forzar un tipo incorrecto. Si no son compatibles, lo más simple y seguro es pasar solo el `saleId` hacia arriba y que `Returns` haga su propio `fetch(`/api/sales?q=...`)` o agregue un `getSale(id)` puntual — priorizá corrección de tipos por sobre ahorrarte una llamada de red.

---

## Sección 3 — Diagnosticar: ¿por qué una venta recién creada no aparece en la búsqueda de Devoluciones?

Diego reportó que una venta que se genera queda visible enseguida en "Historial" (`sales-list.tsx`) pero no la encuentra en "Devoluciones" (`returns.tsx`).

Revisé el código y **no encontré un bug evidente**: `listSales` (`src/modules/sales/sale-data-access.ts:420`) ordena `saleDate desc` sin filtros raros, `saleDate` usa `@default(now())` de Postgres (sin desfasaje de timezone aplicado en la escritura), la ruta `/api/sales` es `force-dynamic` (sin cache), y `Returns.fetchSales()` no aplica ningún filtro cuando no hay chip de búsqueda seleccionado — así que una venta nueva debería aparecer primera en la lista sin filtros.

Antes de tocar código: **reproducí el caso a mano** — creá una venta de prueba en el POS, andá inmediatamente a la pestaña Devoluciones sin tocar ningún chip de búsqueda, y confirmá si aparece o no en la lista de la izquierda. Si:
- **Se reproduce sin filtro activo:** hay un bug real — investigá con más profundidad (revisar si hay algún caché de red/browser, si `tenantId` coincide, si el fetch se dispara antes de que la venta termine de commitear). Documentá la causa raíz encontrada y corregila.
- **No se reproduce sin filtro, pero sí con un chip de búsqueda activo** (ej. folio/cliente/documento): ahí sí puede haber un bug de matching en el filtro — reproducilo con el chip específico que falló y corregilo.
- **No se reproduce de ninguna forma:** lo más probable es que la confusión de Diego venga de la falta de preselección automática (resuelta en la Sección 2) — dejá una nota breve en el reporte de esta orden explicando que no se pudo reproducir y por qué creés que la Sección 2 resuelve la percepción del problema.

No inventes un fix para algo que no pudiste reproducir.

---

## Sección 4 — Reintegro por método de pago real (multi-campo)

Hoy, en el formulario de Devoluciones (`returns.tsx`), debajo de la venta y la fecha aparece el método de pago como texto fijo binario: `sale.paymentType === "CASH" ? "Efectivo" : "Crédito"` (línea ~499) — no contempla Tarjeta, Transferencia, VentaWeb ni ventas `MIXED`. Y el campo de reintegro (`refundMethod`, línea ~198) es un único `<select>` — no importa con cuántos métodos se haya pagado la venta original, solo se puede elegir un método de reintegro.

Diego quiere: **un campo de reintegro por cada método de pago real usado en la venta.** Si la venta se pagó 100% en un solo método, un campo. Si se pagó con 2 métodos (ej. mitad efectivo, mitad tarjeta), 2 campos. Si con 3, 3 campos. La única excepción: cuando el reintegro debe quedar **a favor del cliente** (crédito), ahí sí una sola casilla — esto ya existe parcialmente (`requiresRefundMethod = selectedSale?.paymentType !== "CREDIT"`, línea ~292), mantené ese comportamiento para las ventas 100% `CREDIT`.

### 4.1 — Etiqueta de método de pago real en la lista de ventas
En la lista de ventas de la izquierda (`returns.tsx`, línea ~499), reemplazar el binario `CASH`/`Crédito` por el desglose real usando `parsePaymentDetails(sale.paymentDetails)` (ya importado y usado más abajo en el mismo archivo para `salePaidWithCard`) — mismo criterio que `computePaymentMethodBreakdown` en `cash-register-close.tsx` (ver `TAREAS/CLAUDE.md`, sección 3, "Reconciliación por método de pago real"): mostrar cada método presente (Efectivo/Tarjeta/Transferencia/VentaWeb/Otro), y "Crédito" para lo no cubierto por `paymentDetails` en ventas `MIXED`/`CREDIT`.

### 4.2 — Formulario: N campos de reintegro según método real
Reemplazar el único `<select>` de `refundMethod` (líneas ~676-695) por un bloque que itere `parsePaymentDetails(selectedSale.paymentDetails)` y renderice, por cada `{method, amount}` presente:
- Una etiqueta con el nombre del método y el monto original pagado por ese método.
- Un campo numérico de "monto a reintegrar por este método", prellenado con un valor default razonable (ej. proporcional al total que se está devolviendo, capado al monto original pagado por ese método) y editable.
- Si el método es "Tarjeta", un campo de "N° de operación/cupón" igual al que ya existe (línea ~701), obligatorio para esa línea.

Validación a agregar: la suma de los montos de reintegro de todas las líneas debe ser igual al total de la devolución (`returnTotal`, calculado como ya se calcula hoy) — con una tolerancia de centavos razonable. Ningún campo puede superar el monto original pagado por ese método. Mantené el `canSubmit`/mensajes de ayuda existentes (líneas ~301-303, ~753-758), adaptados a la nueva validación multi-campo.

Para ventas `paymentType === "CREDIT"` (sin `paymentDetails` con métodos reales, o el 100% no cubierto), mantené el comportamiento actual: sin campos de método, el reintegro queda implícito a favor del cliente.

### 4.3 — Backend: `processReturn` acepta el desglose, no un método único
En `src/modules/returns/index.ts`, la función `processReturn` (línea 251) hoy recibe `refundMethod?: string, refundReference?: string` — cambiar la firma para recibir `refundDetails?: { method: ReturnRefundMethod; amount: number; reference?: string }[]` (mismo shape que `Sale.paymentDetails`).

Cambios en la lógica:
- La validación actual `if (salePaidWithCard && refundMethod !== "Tarjeta")` (línea ~280, todo-o-nada) se reemplaza por una validación real: cada `method` de `refundDetails` debe estar entre los métodos que realmente aparecen en `sale.paymentDetails` (usando `parsePaymentDetailsServerSide`, ya importado); la suma de `amount` debe igualar `returnTotal`; ningún monto por método puede superar lo que quedó disponible de ese método considerando devoluciones previas de la misma venta (evitar reintegrar dos veces por el mismo canal en devoluciones parciales sucesivas — sumá lo ya reintegrado en `Return`s anteriores de este `saleId` antes de validar el tope).
- El movimiento de caja (línea ~350, `if (refundMethod === "Efectivo") { ... cashMovement OUT por returnTotal ... }`) cambia: crear el `cashMovement` OUT solo por la **suma de las líneas "Efectivo"** de `refundDetails` (no por `returnTotal` completo), y solo si esa suma es mayor a cero. Sigue exigiendo sesión de caja abierta cuando corresponda.
- Al guardar el `Return` (línea ~390): agregar el nuevo campo `refundDetails` (JSON con el array completo, ver 4.4) como fuente de verdad. Para no romper lo que ya lee `refundMethod`/`refundReference` como texto plano (`ReturnHistoryPanel`, exportación CSV de devoluciones), seguí poblando esas dos columnas como resumen legible: `refundMethod` = nombres de método unidos (ej. `"Efectivo + Tarjeta"`), `refundReference` = la referencia de la línea de Tarjeta si existe.

### 4.4 — Migración de schema
Agregar a `model Return` en `prisma/schema.prisma` un campo nuevo, nullable, aditivo (no rompe datos existentes — mismo criterio que se usó para `Sale.paymentDetails`):
```prisma
refundDetails Json?
```
Correr la migración con el flujo estándar del proyecto (`prisma migrate dev` en local contra una base de desarrollo, nunca directo contra producción — si tenés dudas de cómo se aplicó la migración de `Sale.paymentDetails`, replicá exactamente ese mismo proceso). Actualizar el único caller de `processReturn` (el `POST` en `src/app/api/returns/route.ts` o donde esté) para mandar `refundDetails` en vez de `refundMethod`/`refundReference` sueltos, y actualizar `ReturnConfirmStep` en `returns.tsx` (recibe `refundMethod`/`refundReference` como props hoy, línea ~796) para mostrar la lista completa de líneas de reintegro en la pantalla de confirmación.

Actualizá los tests existentes de `processReturn` (buscá `processReturn` en archivos `*.test.ts`/`*.integration.test.ts` dentro de `src/modules/returns/`) para el nuevo shape — no dejes tests rotos ni tests que mockeen el comportamiento viejo como si fuera correcto.

---

## Entregable
Como siempre: typecheck + lint + tests en verde antes de comittear. Reportá en `TAREAS/REPORTE_DE_CAMBIOS.md` cada sección por separado (especialmente el resultado de la reproducción de la Sección 3, sea cual sea). Commit + push a la rama `design/revision-uiux-sep-2026` al terminar.
