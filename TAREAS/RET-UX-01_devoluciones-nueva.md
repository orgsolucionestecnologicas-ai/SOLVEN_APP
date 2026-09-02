# RET-UX-01 — "Nueva devolución": búsqueda por documento, N° de operación de tarjeta, y tarjeta obligatoria si se pagó con tarjeta

> Orden escrita por el Ingeniero Líder (Cowork), a pedido directo de Diego, dentro de la
> sesión de revisión de diseño UI/UX que arrancó por el POS. A partir de ahora ese tipo de
> cambios se canaliza así — orden estructurada acá, ejecución en VS Code — en vez de que el
> Ingeniero Líder edite directo, para evitar conflictos entre ambos.

## Alcance y rama

- **Rama: `design/revision-uiux-sep-2026`.** Ya existe localmente en este mismo repo, con 3
  commits previos de esta misma sesión de diseño (voseo consistente, botón "Suspender"
  deshabilitado con carrito vacío, navegación de productos por categoría — todo en
  `src/app/ui/pos.tsx`). Si por algún motivo no la encontrás en este working directory,
  **avisá antes de crear una desde cero** — no se debe perder ese trabajo. `git checkout
  design/revision-uiux-sep-2026` y seguí ahí.
- Esta orden toca **solo** la pestaña "Nueva devolución" de `src/app/ui/returns.tsx`
  (`activeTab === "new"`, aprox. líneas 335-664 del archivo actual). **La pestaña
  "Historial" (`ReturnHistoryPanel`, `activeTab === "history"`) no se toca en absoluto.**
- A diferencia del pase de diseño anterior en el POS (que fue solo visual/CSS), esta orden
  sí requiere tocar lógica de negocio y una migración de schema chica — Diego lo autorizó
  explícitamente para este caso puntual. No lo tomes como precedente para tocar lógica sin
  que se pida.

---

## 1. Buscar la venta por documento del cliente (CUIT/DNI), con chips por campo

**Problema actual, más allá de lo que pide Diego:** hoy "Nueva devolución" tiene un único
input ("Buscar venta...", subtítulo "Buscá por ID, cliente o fecha") que filtra
client-side sobre `sales`, cargado con `fetch("/api/sales")` **sin ningún parámetro**
(`returns.tsx` línea ~182). Como `listSales` (`src/modules/sales/sale-data-access.ts`)
tiene `limit = 20` por default, esa pantalla solo puede buscar dentro de las 20 ventas
más recientes — si la venta que se busca es más vieja, el buscador nunca la va a
encontrar, escriba lo que escriba el cajero. Esto hay que resolverlo de una, no solo
agregar el campo documento.

**Cambios:**

**a) UI — 4 chips en vez de un input único.** Reemplazar el input de la línea ~370-379
por 4 botones tipo chip: **"N° de venta"**, **"Cliente"**, **"Documento"**, **"Fecha"**.
Mismo estilo visual que los chips de categoría del POS (`pos.tsx`, sección de categorías,
rama `design/revision-uiux-sep-2026`: `rounded-full`, violeta cuando está activo, borde
gris cuando no) para mantener consistencia entre pantallas. Al hacer click en un chip,
debajo aparece un input específico para ese campo (o un date picker para "Fecha"), con
placeholder acorde (ej. "N° de venta" → "Ej: A3F92K1L"; "Documento" → "Ej: 20-345678-9").
Cambiar de chip limpia el valor del campo anterior. Ninguno preseleccionado por defecto
está bien, pero documentá la decisión que tomes en el reporte.

**b) Backend — dejar de traer solo 20 ventas y filtrar client-side.** Cablear el fetch al
querystring real de `GET /api/sales` según el chip activo:
- "N° de venta" / "Cliente" → `?q=<valor>` (`listSales` ya soporta esto — el `where` OR
  actual matchea `folio` si es numérico y `customer.name`, ver
  `sale-data-access.ts` función `listSales`, el bloque `where`).
- "Documento" → **nuevo**. Agregar al OR de `listSales` una condición equivalente a
  `{ customer: { taxId: { contains: trimmedQuery, mode: "insensitive" } } }`. También hay
  que agregar `taxId: true` al `select` del `customer` dentro del `include` de esa misma
  función (hoy solo trae `name, phone, email`) — no hace falta mostrar el documento en la
  UI de devoluciones, solo que el filtro lo pueda encontrar.
- "Fecha" → usar los params `from`/`to` que `listSales` ya soporta (mismo día:
  `from=<fecha>T00:00:00`, `to=<fecha>T23:59:59`).
- Subí el `limit` a algo razonable (ej. 50) para esta pantalla, o si preferís hacerlo
  bien de una, paginá de verdad y mostrá "cargar más" cuando `total > data.length`. Lo que
  te resulte más simple de implementar sin bugs — la prioridad es que no se "pierdan"
  ventas en silencio como pasa hoy.
- Debounce de 300ms al tipear: **ya existe este patrón en el mismo archivo**, en
  `ReturnHistoryPanel` (líneas ~849-855) — reusalo, no lo reinventes.

**c) Actualizar el subtítulo** ("Buscá por ID, cliente o fecha", línea ~366) para reflejar
las 4 opciones nuevas.

---

## 2. Centrar más la sección "Nueva devolución"

El wrapper de esta pestaña (línea ~336: `<div className="mx-auto w-full
max-w-screen-xl px-4 py-6 sm:px-6">`) ya está centrado (`mx-auto`) pero es muy ancho
(`max-w-screen-xl` = 1280px) — en monitores grandes las dos columnas (venta a la
izquierda, detalle de la devolución a la derecha) quedan muy separadas y se pierde
sensación de orden. Angostá el `max-w-*` (probá `max-w-5xl` o `max-w-4xl`, el que se vea
mejor con las dos columnas del `grid` sin que el formulario de la derecha quede apretado),
manteniendo `mx-auto`. Verificá en al menos dos anchos (laptop ~1366px, desktop ~1920px)
que ninguna columna quede incómoda antes de dar esto por terminado.

---

## 3. Casilla de N° de operación / cupón de tarjeta

Justo debajo del selector "¿Cómo se reintegra este monto?" (líneas ~597-615), agregar un
input de texto nuevo que **solo aparece cuando `refundMethod === "Tarjeta"`**:

- Label: `N° de operación / cupón de la tarjeta *`
- Placeholder: algo como `Ej: 000123456`
- Obligatorio cuando está visible — bloquea el botón "Revisar devolución" igual que el
  resto de los campos requeridos (sumalo a la condición `canSubmit`, línea ~253).

**Persistencia — nuevo campo en `Return`** (`prisma/schema.prisma`, líneas ~530-542):

```prisma
model Return {
  id             String               @id @default(cuid())
  saleId         String
  sale           Sale                 @relation(fields: [saleId], references: [id])
  items          ReturnItem[]
  totalAmount    Decimal              @db.Decimal(12, 2)
  reasonCategory ReturnReasonCategory @default(OTRO)
  reasonNote     String?
  refundMethod   String?
  refundReference String?             // N° de operación/cupón — obligatorio si refundMethod === "Tarjeta"
  createdAt      DateTime             @default(now())

  @@index([saleId])
}
```

Migración: `npx prisma migrate dev --name add_return_refund_reference`, aplicarla contra
Neon con el mismo procedimiento ya usado en migraciones anteriores del proyecto —
**confirmar en el reporte que quedó aplicada de verdad contra la base real**, no solo que
`schema.prisma` la tiene.

**Threading del dato:**
- `POST /api/returns` (`src/app/api/returns/route.ts`): aceptar `refundReference?: string`
  en el body; validar 400 si `refundMethod === "Tarjeta"` y `refundReference` falta o está
  vacío.
- `processReturn` (`src/modules/returns/index.ts`, firma en línea ~237-243): agregar el
  parámetro `refundReference?: string` y guardarlo en el `tx.return.create` (buscá dónde
  ya se guarda `refundMethod` en esa función, cerca de la línea ~367).

---

## 4. OBLIGATORIO: si la venta se pagó (total o parcialmente) con tarjeta, el reintegro tiene que ser con tarjeta sí o sí

Diego fue explícito: **"SI O SI, como obligación"**. No es una sugerencia de UI, tiene que
estar bloqueado también en el backend.

**Contexto de datos ya disponible:** `Sale.paymentDetails` (Json) guarda el desglose real
de métodos de pago de la venta original — `{method, amount, reference?}[]` (el tipo
`PaymentDetail` ya está definido en `returns.tsx` línea 19, y `processReturn` ya carga el
`sale` completo así que `paymentDetails` está disponible ahí sin queries extra). Si algún
elemento de ese array tiene `method === "Tarjeta"`, la venta se pagó (aunque sea
parcialmente) con tarjeta.

**a) Frontend (`returns.tsx`):** al armar las opciones del selector "¿Cómo se reintegra
este monto?" (hoy `REFUND_METHOD_OPTIONS` es una lista fija, líneas 33-39) — si la venta
seleccionada tiene `Tarjeta` en su `paymentDetails`, el selector debe ofrecer **solo**
"Tarjeta" (sacá las demás opciones de la lista, o mostralas deshabilitadas con un texto
tipo "Esta venta se pagó con tarjeta — el reintegro debe ser con tarjeta"). Si la venta NO
tiene tarjeta en su `paymentDetails`, comportamiento actual sin cambios.

**b) Backend, obligatorio, no solo UI** (`processReturn`, `src/modules/returns/index.ts`,
cerca de la línea ~259 donde ya existe `if (sale.paymentType !== "CREDIT" &&
!refundMethod)`): agregar una validación equivalente a:

```ts
const salePaidWithCard = parsePaymentDetailsServerSide(sale.paymentDetails)
  ?.some((p) => p.method === "Tarjeta") ?? false;

if (salePaidWithCard && refundMethod !== "Tarjeta") {
  throw new ReturnValidationError(
    "Esta venta se pagó con tarjeta — el reintegro debe hacerse con tarjeta."
  );
}
```

Esto es la intención, no un parche literal — ajustá nombres y ubicación exacta al código
real. Revisá primero si ya existe en `src/modules/sales` o `src/modules/returns` algún
parser de `paymentDetails` que puedas reusar en vez de escribir uno nuevo (el de
`returns.tsx` es client-side, del lado del servidor puede que haga falta uno equivalente
o que ya exista algo parecido — no dupliques lógica si no hace falta).

**Esta es la parte más importante de toda la orden.** Quiero que quede cubierta con un
test de integración nuevo en `src/modules/returns/index.integration.test.ts` (ya existe y
tiene tests de `refundMethod` en las líneas 16-138 — seguí el mismo patrón/fixtures): un
test que arma una venta con `paymentDetails: [{ method: "Tarjeta", amount: ... }]`, llama
`processReturn` con `refundMethod: "Efectivo"`, y confirma que rechaza con
`ReturnValidationError`. Y otro que confirme que con `refundMethod: "Tarjeta"` sí procesa
bien en ese mismo escenario.

---

## Al terminar (obligatorio, no saltear ningún paso)

1. `npm run lint && npm run typecheck && npm test` — no commitear nada si algo falla.
2. Confirmar la migración de `refundReference` aplicada contra Neon (consulta de solo
   lectura contra `_prisma_migrations`/`information_schema`, no alcanza con que
   `schema.prisma` la tenga).
3. Commit del código en la rama **`design/revision-uiux-sep-2026`** — NO en `main`, y NO
   mergear a `main` bajo ningún concepto. Esa rama espera preview de Vercel y aprobación
   visual de Diego antes de mergear, igual que el resto de esta sesión de diseño. Mensaje
   de commit descriptivo en español (revisá `git log` de la rama para mantener el mismo
   estilo que los 3 commits anteriores).
4. Push de la rama a origin: `git push origin design/revision-uiux-sep-2026` — esta sí
   tiene que llegar a GitHub, es lo que va a generar el preview de Vercel.
5. Entrada corta (2-4 líneas) al tope de `TAREAS/REPORTELIDER.md` con el resumen y el/los
   hash(es) de commit.
6. Este archivo de orden (`TAREAS/RET-UX-01_devoluciones-nueva.md`) ya fue commiteado en
   `main` por el Ingeniero Líder antes de pasarte esta tarea — no hace falta que lo
   vuelvas a commitear vos, pero si lo archivás (`git rm`) al cerrar, hacelo también en
   `main`, no en la rama de diseño.
7. Entregable breve al final: archivos modificados, resultado de
   lint/typecheck/test, hash(es) de commit, y confirmación de la migración contra Neon.
   **No te autocalifiques como "verificado"** — ese veredicto lo da el Ingeniero Líder
   después de revisar el diff real, no quien escribió el código.
