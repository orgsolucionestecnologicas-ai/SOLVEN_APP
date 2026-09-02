# CAJA-UX-01 — Caja al día + formato profesional de PDFs y CSVs exportables

> Orden del Ingeniero Líder (Cowork), a pedido de Diego, dentro de la sesión de revisión
> de diseño UI/UX. Continúa en la misma rama `design/revision-uiux-sep-2026` (ya tiene el
> trabajo de POS, Devoluciones y Productos encima — no partir de `main`, partir de la punta
> de esa rama). Esta orden se commitea en `main`, el código va a la rama de diseño.
>
> **Alcance explícito de esta orden, según indicó Diego:** una pasada de Caja (no se
> esperan muchos cambios, es una revisión de "que todo esté en orden") + que todos los
> botones que imprimen algo o exportan a PDF/CSV en toda la app tengan un formato
> profesional. Cotizaciones, Reportes y Ajustes **como pantallas** quedan para más
> adelante — no rediseñes esas pantallas. El ticket común de papel térmico (el comprobante
> que se le da al cliente en el POS) también queda para más adelante, aparte — no lo
> toques en esta orden.

---

## Sección 1 — Caja

### 1.1 — Bug de datos: "Tarjeta" y "Transferencia" están hardcodeados en $0 en el cierre de caja

**El hallazgo más importante de esta orden, no es cosmético.** En
`src/app/ui/cash-register-close.tsx`, la tabla "Ventas por método de pago" (línea
~486-524) arma sus filas así:

```ts
{ label: "Efectivo", count: cashSales.length, amount: totalCashSales, pct: ... },
{ label: "Tarjeta", count: 0, amount: 0, pct: 0 },
{ label: "Transferencia", count: 0, amount: 0, pct: 0 },
{ label: "Crédito", count: creditSales.length, amount: totalCreditSales, pct: ... },
```

Las filas de Tarjeta y Transferencia están **literalmente hardcodeadas en cero** — nunca
se calculan de datos reales. Mientras tanto la fila "Total" de esa misma tabla sí suma
`totalSales`, que incluye TODAS las ventas de la sesión sin importar el método. Además, el
tipo local `SaleRecord` de este archivo (línea ~29-36) declara
`paymentType: "CASH" | "CREDIT"` — pero el schema real tiene un tercer valor,
`"MIXED"` (confirmado en `src/app/api/sales/route.ts` línea 45 y en
`src/modules/sales/sale-validation.ts`). Como ni `cashSales` ni `creditSales` ni las filas
hardcodeadas capturan `MIXED`, **una venta pagada parte en efectivo y parte con tarjeta
queda completamente invisible en el desglose por método** (no cuenta en Efectivo, no
cuenta en Tarjeta, no cuenta en Crédito) aunque sí infla el Total — el desglose y el total
dejan de sumar lo mismo apenas hay una sola venta con tarjeta, transferencia o pago mixto
en el día. Para un negocio que además acepta pagos combinados (lo dice la propia landing de
SOLVEN), este es un bug de integridad de los datos que el dueño usa para cuadrar caja, no
un detalle visual.

**Fix:**

1. El método real de pago de cada venta vive en `Sale.paymentDetails`
   (`{method: string; amount: number; reference?: string}[]`, columna `Json?` ya
   existente — no hace falta migración). `src/app/ui/returns.tsx` (línea ~41-47) ya tiene
   un `parsePaymentDetails(value: unknown): PaymentDetail[] | null` client-side y
   `src/modules/returns/index.ts` tiene el equivalente server-side
   (`parsePaymentDetailsServerSide`) — reusá ese mismo patrón, no inventes uno nuevo.
2. Confirmá que `paymentDetails` viaje en la respuesta de `/api/sales` (el endpoint que
   `cash-register-close.tsx` ya consume vía `fetch("/api/sales")`, línea ~140) — hoy no
   viaja (`grep paymentDetails src/app/api/sales/route.ts` no da resultados). Sumalo a la
   selección/mapeo de la respuesta de esa ruta si hace falta, sin romper nada que ya
   dependa de esa respuesta.
3. En `cash-register-close.tsx`: corregí el tipo `SaleRecord` para que `paymentType`
   incluya `"MIXED"`, agregá `paymentDetails: unknown` al tipo, y calculá los montos reales
   de Tarjeta y Transferencia sumando `paymentDetails` de TODAS las ventas de la sesión
   (no solo las que hoy caen en `cashSales`/`creditSales` — una venta `MIXED` puede aportar
   a más de una fila a la vez, eso es correcto y esperado). El objetivo final: la suma de
   las 4 filas (Efectivo + Tarjeta + Transferencia + Crédito) más lo que corresponda a
   `MIXED` tiene que poder reconciliarse contra `totalSales` — si una venta reparte su
   monto entre dos métodos, cada método se lleva su parte proporcional real, no el total
   de la venta.
4. Si alguna venta no tiene `paymentDetails` cargado (dato viejo, o una venta 100%
   `CREDIT` que legítimamente no tiene desglose), no rompas el cálculo — tratala igual que
   ya se trata hoy `costPrice: null` en reportes: excluila del desglose por método en vez
   de asumir un valor.
5. Agregá un test de integración chico que arme una sesión con una venta en efectivo, una
   con tarjeta y una mixta (efectivo + tarjeta), cierre la caja, y confirme que las 4 filas
   de método de pago suman lo mismo que el total de ventas de la sesión.

### 1.2 — Botón "Exportar" del header de Movimientos de caja es un stub, hay otro que sí funciona al lado

En `src/app/ui/cash-movements-list.tsx`, el botón del header (línea ~377-384) hace
`onClick={() => alert("Exportar estará disponible próximamente.")}` — un `alert()` de
"próximamente". A pocos centímetros, en la fila de filtros (línea ~482-489), hay OTRO
botón "Exportar CSV" que sí funciona de verdad (`exportCashMovementsToCsv`). Sacá el botón
stub del header — no dejes dos botones "Exportar" en la misma pantalla donde uno es falso.
Si te parece que el header necesita un acceso directo a exportar, hacé que dispare la misma
función real (`exportCashMovementsToCsv(filteredMovements)`) en vez de duplicar código.

### 1.3 — Voseo inconsistente en Apertura de caja

`src/app/ui/cash-register-open.tsx` usa tuteo en varios lugares (línea 166 "debes abrir la
caja", 285 "Ingresa el monto", 411 "Verifica el efectivo", 413 "Guarda los billetes", 423
"Completa la información", 424 "Define el monto", 425 "Confirma la apertura") mientras el
resto de la app ya usa voseo consistente (fix hecho en POS esta misma sesión de diseño, y
`cash-register-close.tsx` línea 841 ya usa "Explicá" correctamente). Pasá esos 7 textos a
voseo: "debés", "Ingresá", "Verificá", "Guardá", "Completá", "Definí", "Confirmá".

### 1.4 — Botones placeholder ocultos sin usar

Dos botones con `className="hidden ..."` que nunca se muestran, código muerto en la
práctica: "Filtros avanzados" en `cash-movements-list.tsx` (línea ~500-506) y "Ver todas
las categorías →" en el mismo archivo (línea ~720-722). Sacalos. Si en algún momento se
va a implementar filtros avanzados o el detalle de categorías, que se agregue cuando esté
listo, no como un botón fantasma en el DOM.

### 1.5 — "Imprimir cierre" imprime la pantalla completa, sin formato de impresión

En `cash-register-close.tsx`, el botón "Imprimir cierre" (línea ~364-371) llama
`window.print()` directo sobre toda la pantalla — inputs de denominaciones, botones,
sidebar, todo. A diferencia de `ClosedSessionDetailModal` en `cash-movements-list.tsx`
(línea ~934 en adelante), que sí tiene clases `print:hidden`/`print:block` para ocultar la
UI interactiva y mostrar solo un resumen limpio al imprimir. Aplicá el mismo criterio acá:
al imprimir, debería verse un resumen prolijo del cierre (nombre del negocio, cajero,
fecha, totales por método de pago ya corregidos en 1.1, conteo de efectivo, diferencia) sin
inputs ni botones — no necesariamente un rediseño, alcanza con agregar las clases
`print:hidden` a lo que no corresponda imprimir (formulario de denominaciones editable,
sidebar, botones) y un bloque `print:block` con el resumen, igual que ya existe como
ejemplo en el otro archivo.

---

## Sección 2 — Formato profesional de PDFs y CSVs exportables (toda la app)

Confirmé por lectura de código que hay dos plantillas de PDF ya bien resueltas —
`src/app/ui/quote-pdf.tsx` y `src/app/ui/return-credit-note-pdf.tsx` (mismo estilo:
header con marca, secciones con datos, tabla con columnas de ancho proporcional al
contenido, montos con `formatARS` usando `toLocaleString("es-AR", {minimumFractionDigits:
2, maximumFractionDigits: 2})`, columnas numéricas alineadas a la derecha, fila de
totales). **Usalas como referencia de calidad** — el objetivo de esta sección es llevar
el resto al mismo nivel, no inventar un estilo nuevo.

### 2.1 — `report-pdf.tsx` (Reportes → Exportar PDF de Ventas y de Productos) queda por debajo del resto

`src/app/ui/report-pdf.tsx` es la plantilla genérica que usa
`src/app/api/reports/export-pdf/route.tsx` para los dos reportes exportables
("ventas" y "productos"). Comparado con `quote-pdf.tsx`/`return-credit-note-pdf.tsx`:

- Los montos se insertan crudos (`s.totalAmount.toString()`, `p.costPrice?.toString()`,
  etc.) sin formato de moneda — sale "38750" en vez de "$ 38.750,00". Aplicá el mismo
  `formatARS` que ya usan las otras dos plantillas (podés extraerlo a un helper
  compartido, ver 2.3, o duplicarlo igual que ya está duplicado en las otras dos — a tu
  criterio, pero no lo dejes sin formatear).
- Todas las columnas usan `flex: 1` por igual (línea 11, `styles.cell`) sin importar el
  contenido — en el reporte de ventas la columna "Productos" (que concatena todos los
  ítems de la venta separados por " | ") necesita mucho más ancho que "Fecha" o "Total".
  Dale anchos con sentido (ej. `flex: 3` para Productos/Cliente, `flex: 1` para
  Fecha/Folio/Total) y alineá a la derecha las columnas numéricas (Total, Precio costo,
  Precio venta, Stock), igual que hace `colQty`/`colPrice`/`colTotal` en `quote-pdf.tsx`.
- No tiene fila de totales. El reporte de ventas debería cerrar con el total general
  vendido en el período, mismo patrón visual que el `totalsRow` de `quote-pdf.tsx`.
- No tiene fecha/hora de generación ni numeración de página — con reportes de muchas
  ventas esto puede ser varias páginas en A4 landscape. Agregá "Generado el DD/MM/AAAA
  HH:mm" junto al pie ya existente, y numeración "Página X de Y" (`@react-pdf/renderer`
  soporta el render prop `render={({ pageNumber, totalPages }) => ...}` en un `<Text>`
  con `fixed` — no hace falta ninguna librería nueva).

### 2.2 — Bug: `costPrice` nulo sale como `"null"` en el CSV de productos

`src/app/api/reports/export/route.ts` (tipo `"productos"`, línea ~82) arma la fila así:

```ts
return `${nombre},"${codigo}","${cat}",${p.costPrice},${p.salePrice},...`;
```

`p.costPrice` ya es nullable en el schema (desde PROD-UX-01, en la rama de diseño donde
vas a trabajar) — este mismo archivo NO estaba en la lista de archivos auditados en esa
orden anterior (el PDF equivalente, `export-pdf/route.tsx`, sí se corrigió; este CSV se
coló). Un producto sin costo cargado hoy va a aparecer con la palabra literal `"null"` en
la celda de precio de costo cuando se abra en Excel — corregilo al mismo criterio que ya
se usó en el PDF: `p.costPrice?.toString() ?? ""` (celda vacía, no "null").

### 2.3 — Falta el BOM de UTF-8 en absolutamente todas las exportaciones CSV de la app

Ningún CSV de SOLVEN lleva el BOM de UTF-8 (`﻿`) al principio del archivo — confirmé
que no aparece en ningún lado del código (`grep -r "uFEFF" src` no da resultados). Esto
importa en la práctica: Excel en Windows —que es lo que va a usar la enorme mayoría de los
dueños de comercio y sus contadores en Argentina— no detecta UTF-8 automáticamente sin
BOM, y va a mostrar "Añlisis" en vez de "Análisis" apenas un nombre de producto o cliente
tenga tilde o ñ, si el archivo se abre haciendo doble clic (el flujo normal, no importar
manualmente con la codificación seleccionada a mano). Es un solo causa raíz, afecta a
los 10 puntos de generación de CSV de la app:

Client-side (todos con su propia función `escapeCsvValue` duplicada — buena oportunidad
para juntarlas en un solo lugar de paso):
`sales-list.tsx`, `returns.tsx`, `reports.tsx` (la función `exportServicesCsv`),
`products-inventory.tsx`, `expenses-list.tsx`, `debts-list.tsx`, `customers-list.tsx`,
`cash-movements-list.tsx`, `InventoryTab.tsx` (`src/app/products/components/`).

Server-side: `src/app/api/reports/export/route.ts` (los dos tipos, "ventas" y
"productos").

**Fix recomendado:** creá `src/lib/csv.ts` con un `escapeCsvValue(value: string): string`
único y un helper `downloadCsv(filename: string, header: string[], rows: string[][]):
void` que arme el contenido con el BOM (`"﻿" + [header, ...rows].map(...).join(...)`)
y dispare la descarga (el mismo patrón `Blob` + `URL.createObjectURL` + `<a>` que ya se
repite en los 9 archivos client-side) — y hacé que los 9 lo llamen en vez de reimplementar
la descarga cada uno. Para el archivo server-side, alcanza con anteponer `"﻿"` al
string final antes de devolver la `Response`. No es obligatorio unificar los 9 archivos en
un solo commit gigante si te resulta más seguro ir de a uno — lo que sí es obligatorio es
que los 10 puntos terminen con el BOM antepuesto, sin excepción.

No cambies el delimitador (`,`) ni la codificación de comas dentro de valores — eso ya
está bien resuelto con las comillas y el escape de comillas dobles existentes. Si notás
que además convendría separador `;` para Excel configurado en español de Argentina, dejalo
anotado como sugerencia en el reporte, no lo implementes sin que Diego lo pida — cambiar
el delimitador es más intrusivo y no fue parte de lo pedido.

---

## Al terminar (obligatorio, no saltear ningún paso)

1. `npm run lint && npm run typecheck && npm test` — no commitear si algo falla.
2. Sin migraciones nuevas en esta orden (todo lo de Caja usa columnas que ya existen). Si
   en algún punto te parece que hace falta una, confirmá con una nota en el reporte antes
   de aplicarla — no debería ser necesario.
3. Commit del código en la rama `design/revision-uiux-sep-2026` (partiendo de su punta
   actual, no de `main` — esa rama ya tiene POS, Devoluciones y Productos encima). Podés
   separar en más de un commit (por ejemplo uno para Caja, otro para PDF/CSV) si te
   resulta más prolijo — no hace falta que sea uno solo.
4. Push de la rama a origin: `git push origin design/revision-uiux-sep-2026`.
5. Entrada corta (2-4 líneas) al tope de `TAREAS/REPORTELIDER.md` **en `main`**, no en la
   rama de diseño.
6. Si encontrás que `TAREAS/CLAUDE.md` necesita un ajuste genuino por algo de esta orden
   (por ejemplo, documentar el patrón de `paymentDetails` por método de pago si te parece
   que va a ser útil para trabajo futuro, o el helper nuevo `src/lib/csv.ts`), hacelo — es
   parte del cierre de esta orden, no un paso aparte.
7. Entregable breve: archivos modificados, resultado de lint/typecheck/test, hashes de
   commit. **No te autocalifiques como "verificado"** — eso lo determina el Ingeniero
   Líder después de revisar el diff real.

Esta orden cierra la sesión de revisión de diseño UI/UX de esta semana. Después de que la
verifique, queda pendiente (para otra sesión) el merge de toda la rama `design/*` a `main`
vía preview de Vercel + aprobación visual de Diego, y el trabajo del ticket térmico común.
