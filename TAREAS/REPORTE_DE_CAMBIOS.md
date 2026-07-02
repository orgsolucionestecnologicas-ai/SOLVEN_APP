# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

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
