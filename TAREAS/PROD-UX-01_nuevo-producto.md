# PROD-UX-01 — "Nuevo producto": costo opcional, sin margen, SKU inteligente por categoría, código de barras real

> Orden del Ingeniero Líder (Cowork), a pedido de Diego, dentro de la sesión de revisión
> de diseño UI/UX. Mismo protocolo que `RET-UX-01`: código en la rama
> `design/revision-uiux-sep-2026` (ya existe, con 4 commits previos — POS y Devoluciones),
> esta orden se commitea en `main`.
>
> **Los exports/descargables (PDF, CSV) quedan para una orden aparte** — Diego confirmó
> que no van en esta tanda; van a revisarse en una orden dedicada una vez que se releven
> los ~10 archivos involucrados (reportes, cotizaciones, notas de crédito, inventario).

## Alcance

Esta orden toca **solo** el formulario de producto: `src/app/ui/product-form.tsx`
(se usa tanto para crear como para editar — `src/app/products/new/page.tsx` y
`src/app/products/[id]/product-edit-view.tsx`), más lo estrictamente necesario en
`prisma/schema.prisma`, `src/modules/products/*`, `src/app/api/products/*`, y **el
matching de escaneo de código en el POS** (`src/app/ui/pos.tsx`, ver Sección 4 — es una
consecuencia directa de agregar un código de barras real, no scope creep).

**No toques:** `src/modules/sales/*` más allá de lo que exige la Sección 1 (costPrice
opcional), `src/modules/inventory/*`, ni ningún flujo de ARCA/facturación.

---

## 0. Contexto importante que encontré investigando (no son pedidos nuevos, son hallazgos)

Antes de tocar nada, dos cosas que hacen falta saber:

1. **El campo "SKU" del formulario hoy es decorativo — nunca se guarda.** El estado
   `sku` (línea ~101, con el botón "Auto" que llama `generateSku(name)`, línea ~214-218)
   **no aparece en ningún lado del `payload` que se manda a la API** (ver el `handleSubmit`,
   líneas ~249-251). Lo mismo pasa con `barcode` (línea 102) y `brand` (línea 104): se
   capturan en el form, se muestran en pantalla, y se descartan silenciosamente al guardar.
   `subcategoryName` (línea que setea `subcategoryName`) tampoco se manda, pese a que
   `Product.subcategoryId` sí existe en el schema — ese sí hay que corregirlo de paso en
   esta orden porque es una columna real que se está perdiendo (ver Sección 5). `brand` NO
   tiene columna en `Product` — no lo arregles acá, dejalo anotado en `PENDIENTES.md` como
   pregunta de producto para Diego ("¿el catálogo debería tener marca?"), no es parte de
   esta orden.

2. **Hoy no existe ningún campo de código de barras real en la base.** `Product` solo
   tiene `productCode` (`prisma/schema.prisma` línea ~159), que es el código interno
   autogenerado tipo `PROD-0001` (`src/lib/generate-code.ts`, contador **global compartido
   entre TODOS los tenants de la plataforma** — no por comercio). El "escaneo" del POS
   (`pos.tsx`, función que matchea código exacto al escribir en el buscador, líneas
   ~713-724) compara contra `productCode`, **no contra un código de barras real** —
   así que hoy, si un cajero escanea el código de barras real de fábrica de un producto
   (ej. un EAN-13 de Coca-Cola) con una pistola lectora, no matchea nada. Eso es lo que
   esta orden corrige en la Sección 4.

---

## 1. Precio de compra pasa a opcional

**Frontend** (`product-form.tsx`):
- Sacar `required` del `<FormField>`/`<input>` de "Precio de compra" (línea ~512-530).
- En `validate()` (línea ~220-233), sacar el chequeo que hoy obliga `costPrice`.
- En `handleSubmit` (líneas ~249-251), si `costPrice` está vacío no mandar
  `parseFloat(costPrice)` (que da `NaN`) — mandar `undefined`/omitir la clave.

**Backend** — esto sí requiere tocar schema y es el cambio de mayor riesgo de toda la
orden, hacelo con cuidado:
- `prisma/schema.prisma`: `Product.costPrice` pasa de `Decimal @db.Decimal(12, 2)` a
  `Decimal? @db.Decimal(12, 2)` (nullable). Migración
  `npx prisma migrate dev --name product_cost_price_optional`, aplicar y **verificar
  contra Neon con consulta de solo lectura** (mismo criterio que toda migración anterior
  del proyecto).
- `src/modules/products/product-validation.ts`: sacar la validación de obligatoriedad de
  `costPrice`, permitir `undefined`/`null`.
- `src/modules/products/product-data-access.ts`: la función `updateProduct` (línea ~80-93)
  hace `existing.costPrice.toNumber()` y `product.costPrice.toNumber()` sin chequear null
  — **esto va a explotar en runtime** si alguno de los dos es `null`. Ajustalo para que
  maneje `null` (tratalo como "sin cambio de costo" si sigue siendo `null`, o compará con
  `?? null` según corresponda — el objetivo es que no rompa, no que el audit log sea
  perfecto).
- **Auditá los demás usos reales de `costPrice`/`Product.costPrice`** (no los tests, esos
  se ajustan solos si hace falta) y asegurate de que ninguno trate `null` como `0` en un
  cálculo de margen/ganancia (eso mostraría falsamente 100% de margen para un producto sin
  costo cargado — es peor que no mostrar nada). Archivos a revisar, todos con al menos una
  referencia a `costPrice`:
  - `src/modules/sales/sale-data-access.ts`
  - `src/app/api/reports/export-pdf/route.tsx`, `src/app/api/reports/export/route.ts`
  - `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`
  - `src/app/ui/sales-list.tsx`, `src/app/ui/reports.tsx`
  - `src/app/products/[id]/product-edit-view.tsx`
  - `src/app/ui/inventory-adjust-form.tsx`, `src/app/ui/inventory-entry-form.tsx`
  - `src/app/ui/onboarding-wizard.tsx`, `src/app/ui/products-inventory.tsx`
  - `src/app/products/components/InventoryTab.tsx`
  - `src/modules/dashboard/*` (resumen del dashboard probablemente calcula margen agregado)

  En cada uno donde se calcule margen/ganancia agregada (dashboard, reportes), la regla es:
  **un producto con `costPrice = null` se excluye de ese cálculo puntual, no se cuenta
  como costo cero.** Si alguno de estos archivos no toca `costPrice` para matemática
  (por ejemplo solo lo tipea o lo muestra tal cual), no hace falta cambiar nada ahí más
  que el tipo TypeScript.

---

## 2. Sacar el campo "Margen de ganancia %"

`product-form.tsx`: sacar el `<FormField htmlFor="pf-margin">` completo (línea ~532-544),
el estado `margin` (línea ~107-116) y las funciones `handleMarginChange`/el cálculo
bidireccional costo↔margen↔venta (líneas ~188-212 aprox. — dejá `handleCostPriceChange`/
`handleSalePriceChange` pero sin la parte que syncea `margin`). El campo "Precio de venta"
(línea ~546-564) y "Alícuota de IVA" (línea ~566-586) **se quedan tal cual están**, ya no
dependen de margen para nada — el usuario carga el precio de venta directamente.

Sacá también el texto de ayuda "El precio de venta se calcula automáticamente según el
margen de ganancia" (línea ~588-593) — ya no aplica.

---

## 3. Proveedor — ya está opcional, no hace falta cambiar nada

Confirmé que `validate()` (línea ~220-233) no exige `supplierId`, así que "Proveedor" ya
es opcional hoy. No hace falta ningún cambio acá — lo dejo documentado para que quede
registrado que se revisó, no lo saltees por error pensando que falta algo.

---

## 4. Código de barras real + SKU/código automático inteligente por categoría

**a) Nuevo campo real en la base para el código de barras:**

```prisma
model Product {
  ...
  productCode  String?
  barcode      String?   // código de barras real del producto (EAN-13, etc.), opcional
  ...
  @@unique([tenantId, productCode])
  @@unique([tenantId, barcode])
}
```

(Postgres permite múltiples `NULL` en una columna con `@@unique`, así que productos sin
código de barras cargado no chocan entre sí — no hace falta ninguna condición especial.)
Migración `npx prisma migrate dev --name product_barcode`, aplicar y verificar contra Neon.

**b) Wirear el campo del formulario que ya existe** ("Código de barras", `product-form.tsx`
línea ~408-424, estado `barcode` línea 102) para que sí viaje en el `payload` de
`handleSubmit` y se persista en `createProduct`/`updateProduct`
(`src/modules/products/product-data-access.ts`) y en la validación
(`product-validation.ts`) — hoy se captura y se tira, corregilo.

**c) POS: el escaneo debe matchear también contra el código de barras real.** En
`src/app/ui/pos.tsx`, el tipo `ProductRecord` (línea ~72) necesita el campo `barcode`
(igual que ya tiene `productCode`), el endpoint que alimenta `products` en el POS tiene que
devolverlo, y el efecto de "código exacto → agregar al carrito" (líneas ~713-724 aprox.,
hoy compara solo contra `p.productCode`) tiene que matchear contra `productCode` **o**
`barcode`. También sumalo al filtro de búsqueda por texto (línea ~700-703) si tiene
sentido (buscar escribiendo el código de barras a mano).

**d) SKU/código automático — reemplaza al campo "SKU" manual, no coexiste con él.**
Diego decidió: prefijo de categoría + número secuencial, **por comercio** (no compartido
entre tenants como el contador actual). Formato: `<PREFIJO>-0001`, mismo padding a 4
dígitos que el patrón actual.

- Sacá el input "SKU" y el botón "Auto" del formulario (línea ~370-397 aprox. — la función
  `generateSku(name)` en la línea 79-88 y el estado `sku` línea 101 dejan de usarse). El
  recuadro "Código del producto" que ya existe (línea ~399-406) se queda, pero actualizá el
  texto de ejemplo para reflejar el nuevo formato (ej. "Se generará según la categoría, ej.
  BEB-0001" en vez de "PROD-0001").
- Prefijos por categoría (`SELECTABLE_CATEGORIES` en `product-form.tsx`, línea ~22-32) —
  usá esta tabla, ajustá si alguno te parece confuso pero mantenelos en 3 letras:
  ```
  Alimentos         → ALI
  Bebidas           → BEB
  Lácteos           → LAC
  Limpieza          → LIM
  Cuidado Personal  → CPE
  Hogar             → HOG
  Panadería         → PAN
  Snacks            → SNA
  Otros             → OTR
  ```
- Implementación server-side: **no reutilices `generateCode()` de `src/lib/generate-code.ts`**
  (esa función y su modelo `CodeCounter` los comparten Cliente/Servicio/Cotización/etc.,
  con contador global — no lo toques, es un cambio más grande que esta orden y no fue
  pedido). Escribí una función nueva y separada, por ejemplo
  `generateProductSku(tenantId, categoryName)` en `src/modules/products/` o
  `src/lib/generate-code.ts` (a tu criterio dónde queda más prolijo), respaldada por un
  modelo nuevo:
  ```prisma
  model ProductSkuCounter {
    id             String @id @default(cuid())
    tenantId       String
    tenant         Tenant @relation(fields: [tenantId], references: [id])
    categoryPrefix String
    lastVal        Int    @default(0)

    @@unique([tenantId, categoryPrefix])
  }
  ```
  Mismo patrón transaccional que `generateCode` (upsert con `increment`, dentro de
  `$transaction`) para que dos productos creados casi al mismo tiempo no choquen. Si
  `categoryName` no matchea ninguna de las 9 categorías conocidas, usá `OTR` como fallback
  (no rompas la creación del producto por una categoría no mapeada).
- **El código se asigna una sola vez, al crear el producto, y nunca se regenera al
  editar** — aunque después se le cambie la categoría a un producto ya creado, su
  `productCode` no cambia. No implementes lógica de "recalcular código si cambia
  categoría".
- `createProduct` (`product-data-access.ts` línea ~20) hoy llama
  `generateCode("PROD")` — reemplazá esa línea por la llamada a tu función nueva, pasándole
  `tenantId` y la categoría del producto que se está creando.

---

## 5. Sacar el panel "Resumen del producto"

`product-form.tsx`, Panel 3 (línea ~874-925): sacar el panel completo, incluyendo el
`<dl>` de costo/margen/venta/ganancia por unidad. **Ojo:** ese panel también tiene el único
aviso de "esta venta generará pérdida o margen cero" (`isLossOrZeroMargin`, línea ~879-886)
— con el margen fuera del formulario y el costo ahora opcional, ese aviso ya no tiene
mucho sentido tal como está (no siempre hay costo para comparar). Sacalo junto con el
panel, no hace falta preservarlo en otro lado — si te parece que vale la pena un aviso
más simple ("precio de venta menor al de compra", solo cuando ambos existen), dejalo
anotado como sugerencia en el reporte, no lo implementes sin que Diego lo pida.

También sacá la referencia a `SKU: {sku || "--"}` que aparece en el panel de al lado
(línea ~865, dentro del panel de cabecera/estado del producto, no el de Resumen) — con el
SKU manual eliminado (Sección 4), no hay nada que mostrar ahí. Si querés mostrar el
`productCode` real ahí en su lugar (solo en modo edición, ya que en modo creación todavía
no existe hasta guardar), es una mejora razonable — a tu criterio.

---

## 6. Corrección de bug menor de paso: `subcategoryName` no se guardaba

En el mismo `handleSubmit` que vas a tocar para las secciones de arriba, `subcategoryName`
(el dropdown "Subcategoría", línea ~464-479, que sí tiene columna real `subcategoryId` en
`Product`) tampoco viaja en el `payload` hoy. Sumalo mientras estás ahí — reusá el mismo
patrón que ya use el resto del formulario para resolver nombre→id si existe, o si la API
ya espera `subcategoryName` directamente revisá `product-validation.ts` para confirmar el
contrato exacto antes de mandar cualquier cosa.

---

## Al terminar (obligatorio, no saltear ningún paso)

1. `npm run lint && npm run typecheck && npm test` — no commitear si algo falla. Prestá
   atención especial a los tests existentes de `product-data-access`/`product-validation`
   que hoy asumen `costPrice` obligatorio — van a necesitar ajustarse, no solo pasar por
   casualidad.
2. Confirmar las 3 migraciones (`costPrice` nullable, `barcode`, `ProductSkuCounter`)
   aplicadas contra Neon con consulta de solo lectura — no alcanza con que `schema.prisma`
   las tenga.
3. Commit del código en la rama `design/revision-uiux-sep-2026` (NO en `main`, NO mergear).
   Mensaje descriptivo, revisá `git log` de la rama para mantener el estilo.
4. Push de la rama a origin: `git push origin design/revision-uiux-sep-2026`.
5. Entrada corta (2-4 líneas) al tope de `TAREAS/REPORTELIDER.md` **en `main`** (no en la
   rama de diseño — este es el punto que quedó ambiguo en la orden anterior, RET-UX-01,
   y generó una entrada en la rama por error; esta vez sí quiero que quede en `main`,
   aunque tengas que hacer un commit aparte ahí después de terminar el código en la rama).
6. Si encontraste que "Marca" (`brand`) merece una columna real en `Product`, dejalo
   anotado en `TAREAS/PENDIENTES.md` como pregunta de producto para Diego — no lo
   implementes.
7. Entregable breve: archivos modificados, resultado de lint/typecheck/test, hashes de
   commit, confirmación de las 3 migraciones contra Neon. **No te autocalifiques como
   "verificado"** — eso lo determina el Ingeniero Líder después de revisar el diff real.
