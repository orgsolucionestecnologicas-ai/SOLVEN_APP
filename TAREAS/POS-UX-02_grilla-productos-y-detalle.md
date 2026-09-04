# POS-UX-02 — Grilla de productos por categoría + acceso a la ficha técnica

> Rama: `design/revision-uiux-sep-2026`. Diego revisó el preview de Vercel y pidió este cambio puntual sobre la vista de categorías del POS. Investigación de código ya hecha por el Ingeniero Líder — referencias verificadas contra el HEAD actual de la rama.

**No tocar:** Cotizaciones, Reportes, Ajustes, ticket de papel térmico, `src/lib/arca/*`. No tocar la lógica de búsqueda por categorías en sí (chips, `activeCategory`, paginación) — solo el layout de cómo se muestran los productos dentro de una categoría ya elegida.

---

## Sección 1 — Grilla de tarjetas en vez de lista

Hoy, en `src/app/ui/pos.tsx`, cuando se elige una categoría, los productos se renderizan en `<div className="space-y-1">` (aprox. línea 1795) como filas apiladas verticalmente, cada una ocupando el ancho completo (imagen 32px + nombre + categoría + badge de stock + precio + botón "Agregar", todo en una fila `flex items-center`). Diego pidió que en vez de una lista sea una grilla de tarjetas ("cajitas"), para que entren más productos por pantalla.

Ya existe en este mismo archivo un patrón de tarjeta de producto que sirve como referencia directa de estilo — es el que tenía el grid de "Más vendidos" que se sacó en RET-UX-02 (`git show f61212c~1:src/app/ui/pos.tsx` para verlo si hace falta): `grid grid-cols-3 gap-2 sm:grid-cols-4`, cada tarjeta con imagen arriba, nombre truncado a 2 líneas (`line-clamp-2`), precio abajo. Usá ese mismo patrón visual como base, adaptado a lo que ya muestra la fila actual:

- Imagen (o placeholder `Package`) arriba, más grande que los 32px actuales ya que ahora hay más espacio vertical por tarjeta.
- Nombre del producto, 2 líneas máximo con `line-clamp-2`.
- Precio, badge de stock (`ProductStockBadge`, ya existe, reusalo tal cual).
- Badge de cantidad en el carrito (el círculo violeta con el número) cuando `inCartQty > 0` — hoy es un elemento más de la fila, en la tarjeta puede ir superpuesto en una esquina (`absolute`) o como franja, tu criterio.
- El estado "sin stock" (opacity-50, deshabilitado) y el estado "ya en el carrito" (borde violeta) tienen que seguir siendo visualmente distinguibles en la tarjeta, igual que hoy lo son en la fila.
- El click en la tarjeta (fuera del botón "Agregar" y de la cápsula "Detalle" de la Sección 2) sigue agregando el producto al carrito, igual que hoy — no cambies ese comportamiento.
- Ajustá `grid-cols-*` según el ancho real de esta columna del POS (no es el ancho completo de pantalla, es una de varias columnas del layout — mirá el contenedor padre para no copiar literalmente `sm:grid-cols-4` del grid de "Más vendidos" sin chequear que las tarjetas no queden demasiado apretadas o demasiado anchas a los breakpoints reales de esta sección).
- La paginación (`totalPages`, controles de página) sigue funcionando igual, solo cambia el contenedor de `<div className="space-y-1">` a la grilla.

## Sección 2 — Cápsula "Detalle" → ficha técnica del producto

Cada tarjeta necesita una cápsula/badge chico que diga "Detalle" y lleve a la ficha técnica del producto — **no crear una pantalla nueva**, usar la que ya existe: la ruta `/products/{id}` (`src/app/products/[id]/page.tsx` → `ProductEditView`), la misma vista a la que se llega hoy desde la sección Productos del menú principal.

- Abrir en pestaña nueva (`target="_blank" rel="noopener noreferrer"`, con un `<Link>` o `<a>`) — el POS puede tener una venta en curso con productos ya en el carrito, y navegar en la misma pestaña la perdería. Esto es importante, no es un detalle menor.
- El click en la cápsula no debe disparar también el `addToCart` de la tarjeta — cortar la propagación del evento (`e.stopPropagation()` o `e.preventDefault()` según corresponda) para que "Detalle" y "agregar al carrito" sean acciones independientes aunque estén en la misma tarjeta.
- Texto: "Detalle", capsula chica, no necesita ícono si no entra bien en el espacio disponible.

**Punto de atención — no arreglar en esta orden, solo confirmar y documentar:** `ProductEditView` (`src/app/products/[id]/product-edit-view.tsx`) usa `ProductForm` sin ningún modo de solo lectura — muestra el formulario de edición completo sin importar el rol de quien lo mira (la API sí bloquea el `PUT` a `OWNER`/`INVENTORY`, pero el formulario no se entera y deja que cualquier rol intente editar, fallando recién al guardar). Hasta ahora esta vista solo se llegaba desde la sección Productos del menú, probablemente ya restringida por rol en la navegación — con este cambio, un `CASHIER` (el rol típico del POS) va a poder llegar ahí por primera vez de forma frecuente. No es parte de esta orden arreglar `ProductForm` para que tenga un modo de solo lectura — but sí confirmá en el reporte si un `CASHIER` puede llegar a esta pantalla hoy desde el menú de Productos o no, para que el Ingeniero Líder decida si hace falta una orden aparte.

---

## Entregable
`typecheck`/`lint`/`test` en verde (esta parte no tiene cobertura de tests por la limitación ya conocida del repo — sin jsdom/RTL — así que alcanza con typecheck/lint limpios). Reportá en `TAREAS/REPORTE_DE_CAMBIOS.md`. Commit a `design/revision-uiux-sep-2026`.
