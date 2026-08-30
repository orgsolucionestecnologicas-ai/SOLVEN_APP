# FIX-16 — Cotizaciones, IVA por producto, botón de factura, y unificar carritos suspendidos

> Origen: hallazgos de `TAREAS/QA_REPORTE.md` (QA-CHROME-01), verificados contra código real por el Ingeniero Líder (30-08-2026). Estos 4 son un poco más grandes que los de `FIX-15` (tocan formularios de datos o unifican un mecanismo duplicado), pero siguen sin tocar cálculo de dinero en caja/ventas ni lógica de ARCA.

## 1 — Cotización no limpia Email/Teléfono al cambiar de cliente
`src/app/ui/quotes-list.tsx:304-309`, el `onChange` del campo "Cliente" solo limpia `selectedCustomer` cuando el campo queda completamente vacío, y nunca toca `customerEmail`/`customerPhone` (esos se setean solo en `selectCustomer`, líneas 210-216, al elegir del dropdown). Si se escribe un nombre distinto sobre un cliente ya seleccionado, los datos de contacto quedan mezclados de dos clientes distintos. **Fix:** limpiar `customerEmail`/`customerPhone` (y `selectedCustomer`) en cada cambio del campo "Cliente" que no coincida con una selección válida del dropdown, no solo cuando queda vacío.

## 2 — No hay campo de IVA por producto; el ticket del POS siempre muestra "Impuestos (0%)"
Dos bugs relacionados, mismo hallazgo:
- `src/app/ui/product-form.tsx` no tiene ningún input para `ivaRate` (a diferencia de `services.tsx`, que sí lo tiene) — el backend soporta el campo (`src/modules/products/product-validation.ts:110-116`, valores válidos `0/0.105/0.21/0.27`) pero como el form nunca lo envía, todo producto nuevo queda con el default hardcodeado del backend (`0.21`), sin importar el "IVA por defecto" configurado en Ajustes.
- `src/app/ui/pos.tsx:2526-2530` — el resumen del carrito en pantalla tiene el texto **literalmente hardcodeado** `"Impuestos (0%)"` y `{formatMoneyNum(0)}`, sin usar el `ivaRate` real de los ítems (que sí existe en `CartItem`). El PDF de "Imprimir factura" sí calcula bien el IVA por ítem (`handlePrintInvoice`, línea ~3563) — el bug puntual es solo el resumen en pantalla.

**Fix:** (a) agregar selector de IVA al formulario de producto, con el "IVA por defecto" de Ajustes como valor inicial; (b) corregir el resumen del carrito en `pos.tsx` para calcular el IVA real a partir de los ítems, igual que ya hace `handlePrintInvoice`.

## 3 — "Imprimir factura" no se distingue de una factura fiscal real cuando ARCA está deshabilitado
`src/app/ui/pos.tsx:3717-3725` — el botón "Imprimir factura" se muestra siempre, sin condicionarlo a `arcaEnabled`. El botón de emisión ARCA real sí está condicionado (línea 3742). El documento generado sí incluye la aclaración "Documento no válido como factura fiscal." (línea 3691), pero **solo dentro del PDF/impreso**, no en el modal antes de imprimir. **Fix:** renombrar el botón a algo que no diga "factura" sin calificar (ej. "Imprimir comprobante detallado" o similar), o agregar la aclaración también visible en el modal antes de imprimir. No tocar el flujo de ARCA real ni `arcaEnabled` en sí.

## 4 — Badge de "venta suspendida" inconsistente (dos mecanismos de suspensión distintos)
`pos.tsx` tiene dos formas de "suspender" una venta que no se comportan igual:
- `handleSuspend()` (líneas 1049-1058, botón principal "Suspender venta") persiste en `localStorage[DRAFT_KEY]` — sobrevive a navegar fuera y volver.
- `handleSuspendCart()` (líneas 1061-1064, panel de carritos múltiples) solo guarda en estado React `suspendedCarts` (línea 390) — **se pierde al desmontar el componente** (navegar a otra sección), sin persistir en `localStorage` ni backend.

**Fix:** unificar en un solo mecanismo persistido (extender el uso de `localStorage`, o mover ambos a backend si se prefiere) para que las dos formas de suspender se comporten igual y sobrevivan a la navegación de la misma manera.

## Nota — no incluido en esta orden (necesita reproducción en vivo, no solo lectura de código)
El hallazgo "la promoción Automática no se aplica sola al agregar el producto" **no se pudo confirmar ni descartar leyendo el código**: el `useEffect` de `pos.tsx:709-745` (debounce de 400ms) sí debería aplicar promos automáticas sin necesidad de abrir el panel de Promociones — el código parece correcto. Antes de ordenar un fix acá, reproducirlo en vivo (agregar un producto con promo automática activa y cronometrar si el descuento aparece solo, sin tocar el panel) y confirmar si realmente falla o si fue un tema de timing/percepción del tester original.

## Validación y cierre
`typecheck`/`lint`/`test` sin errores. Reportar en `TAREAS/REPORTE_DE_CAMBIOS.md` (sin frases de autoverificación). Commit + push a GitHub al final, se puede dividir en varios commits.
