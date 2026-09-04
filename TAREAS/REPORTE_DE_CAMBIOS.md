# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### 2026-09-04 — POS-UX-02: grilla de productos por categoría + acceso a ficha técnica

**Sección 1 — Grilla de tarjetas.** En `src/app/ui/pos.tsx` (línea ~1795), el contenedor de productos de una categoría elegida pasó de `<div className="space-y-1">` (filas apiladas) a `<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">` (tarjetas). Cada tarjeta: imagen (o placeholder `Package`) de 64px arriba (antes 32px), nombre a 2 líneas (`line-clamp-2`), fila con `ProductStockBadge` (reusado tal cual) + cápsula "Detalle", fila con precio + botón "Agregar". El badge de cantidad en el carrito (círculo violeta) quedó `absolute` en la esquina superior derecha cuando `inCartQty > 0`. Los estados "sin stock" (`opacity-50`, sin `onClick` efectivo) y "ya en el carrito" (borde violeta) se mantienen visualmente distinguibles igual que en la fila anterior. La tarjeta completa ahora dispara `addToCart` al hacer click en cualquier punto salvo el botón "Agregar" y la cápsula "Detalle" (ambos con `e.stopPropagation()` para no duplicar el alta al carrito). La paginación (`totalPages`, controles de página) no se tocó, sigue debajo del grid sin cambios.

Sobre el ancho de columna: el grid de referencia de "Más vendidos" (`grid-cols-3 sm:grid-cols-4`, eliminado en RET-UX-02) vivía en esta misma columna del layout (panel izquierdo `flex-1`, junto al panel de carrito de ancho fijo `w-96`/`lg:w-[480px]`), así que sus breakpoints ya estaban tuneados para este ancho real. Se ajustó igual a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (una columna menos en cada breakpoint) porque las tarjetas nuevas tienen más contenido apilado (imagen más grande + nombre + fila stock/Detalle + fila precio/Agregar, contra imagen+nombre+precio del grid viejo) y necesitan más ancho por tarjeta para no quedar apretadas.

**Sección 2 — Cápsula "Detalle".** Cada tarjeta lleva una cápsula chica "Detalle" (`<Link>` de `next/link`, ya importado en el archivo) que abre `/products/{id}` en pestaña nueva (`target="_blank" rel="noopener noreferrer"`) para no perder el carrito en curso del POS. No se creó ninguna pantalla nueva — reusa `ProductEditView` existente tal cual. El click en la cápsula corta la propagación (`e.stopPropagation()`) para no disparar también el alta al carrito de la tarjeta.

**Punto de atención documentado, no corregido (por alcance de la orden):** se confirmó que un rol `CASHIER` **ya puede llegar hoy** a `ProductEditView` desde el menú principal, no es algo nuevo que introduzca esta orden. El ítem de navegación "Productos" (`src/app/ui/app-shell.tsx`, `navItems`) no tiene `hiddenForRoles` configurado, y la página `src/app/products/[id]/page.tsx` no aplica ningún `requireRole` — solo el middleware de sesión general. La única restricción posible es el override de `RolePermission` por tenant (capa 2 del RBAC), que por defecto no está seteado. Es decir: el gap real (`ProductForm` sin modo de solo lectura consciente del rol del viewer) ya existía y ya era alcanzable por un `CASHIER` vía el menú de Productos antes de este cambio — POS-UX-02 solo agrega una segunda vía de acceso (más frecuente, desde el POS) al mismo problema preexistente. Queda para que el Ingeniero Líder decida si amerita una orden aparte para agregar un modo de solo lectura a `ProductForm` según rol.

**No tocado:** lógica de categorías/chips/`activeCategory`/paginación, Cotizaciones, Reportes, Ajustes, ticket térmico, `src/lib/arca/*`.

**Validación:** `npm run lint` y `npm run typecheck` limpios. Sin tests nuevos — esta parte no tiene cobertura por la limitación ya conocida del repo (sin jsdom/RTL para tests de render de UI), tal como anticipaba la propia orden.
