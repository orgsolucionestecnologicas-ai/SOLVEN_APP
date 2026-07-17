# QA-FIX-05 — Después de cobrar, el POS no vuelve a pedir vendedor/tipo de comprobante

> Reportado por Diego probando el sistema en vivo (no es parte del ciclo de QA 1, que ya está cerrado — es un bug nuevo encontrado en uso real). Alta prioridad: permite generar una venta real sin que el cajero confirme vendedor ni tipo de comprobante, que es justo la validación que el sistema dice tener.

## Causa raíz (ya identificada, no hace falta re-investigar)

`src/app/ui/pos.tsx` tiene **dos bloques de reseteo del carrito que se desincronizaron**:

1. `clearSale()` (línea 949-971) — se usa desde `handleNewSale()` (botón "Nueva venta") y **sí** incluye `setSaleGateResult(null)` (línea 965), obligando a pasar de nuevo por el modal de vendedor/tipo de comprobante (`SaleGateModal`) antes de poder agregar productos o cobrar.
2. El bloque de reseteo dentro de `submitSale()`, inmediatamente después de una venta exitosa (línea ~1404-1419) — resetea carrito, cliente, promociones, descuentos, etc., pero **no incluye `setSaleGateResult(null)`**. Como los checks de "¿puedo agregar producto?" / "¿puedo cobrar?" (líneas 1658, 1768, 1903, 2589, 2593) solo verifican `saleGateResult !== null` — no si la venta es nueva — el cajero puede seguir agregando productos y cobrar de nuevo usando el vendedor y tipo de comprobante de la venta **anterior**, sin que el sistema vuelva a preguntar.

Confirmado que esto no rompe nada más: los datos que sí necesita el modal de impresión de ticket (`receiptType`, `sellerCode`, etc.) ya se toman de `body.data` (la respuesta del servidor), no de `saleGateResult` — así que resetear `saleGateResult` en ese punto no afecta el ticket que se acaba de imprimir.

## Qué hacer

En `src/app/ui/pos.tsx`, dentro de `submitSale()`, en el bloque de reseteo tras una venta exitosa (junto a los demás `set...` de la línea ~1404-1419, antes de `setProductsRefreshKey`), agregar:

```ts
setSaleGateResult(null);
```

Con esto, después de cada venta, el cajero vuelve a ver el estado "Hacé clic en Nueva venta para comenzar" / "Debés seleccionar el vendedor y tipo de comprobante primero" (línea 2080-2088) y no puede agregar productos ni cobrar hasta pasar de nuevo por `SaleGateModal` — mismo comportamiento que ya tiene `clearSale()`.

**Alternativa a evaluar, no obligatoria:** si al revisar el código ven que `submitSale()` y `clearSale()` comparten casi todo el mismo bloque de resets (ambos limpian carrito, cliente, promos, descuentos, etc.), puede ser más prolijo que `submitSale()` llame directamente a `clearSale()` en vez de duplicar cada `set...` a mano — así los dos flujos no se vuelven a desincronizar en el futuro. Si lo hacen así, verificar con cuidado que ningún reset de `clearSale()` (ej. `setSubmitError(null)`, `setSuccessMessage(null)`) pise algo que `submitSale()` necesita setear después (ej. `setShowPrintModal(...)`, `setLastSale(...)`) — el orden de las líneas importa. Si genera dudas o requiere reordenar mucho, mejor quedarse con el fix mínimo de arriba (una sola línea agregada) y no tocar la estructura.

## Restricciones estrictas

1. No tocar `SaleGateModal` (`src/app/ui/sale-gate-modal.tsx`) ni la lógica de validación del backend (`/api/sales`) — el problema es 100% de estado en el frontend de `pos.tsx`.
2. No cambiar qué campos exige el modal (vendedor + tipo de comprobante) ni agregar campos nuevos.
3. Probar manualmente (o con test si ya existe infraestructura para este componente) que: (a) tras completar una venta, intentar agregar un producto sin pasar por "Nueva venta" ya no funciona / muestra el prompt de seleccionar vendedor; (b) el ticket de la venta que se acaba de completar se sigue imprimiendo bien (no se ve afectado por el reset).

## Archivos afectados

- `src/app/ui/pos.tsx` (único archivo esperado)

## Protocolo de reporte

1. `npm run typecheck` sin errores → `git add -A && git commit -m "fix: resetear saleGateResult tras completar una venta (POS dejaba cobrar sin re-seleccionar vendedor/comprobante)" && git push origin main`.
2. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md` un reporte breve: qué se cambió, cómo se verificó, resultado de typecheck/tests, hash del commit.
3. Agregar una entrada corta (2-4 líneas) arriba de todo en `TAREAS/REPORTELIDER.md` (formato `### 2026-07-17 — QA-FIX-05: [resumen]`) — sin borrar las entradas existentes.
4. Entregable en el chat: breve — archivo modificado, cómo se verificó el fix, resultado de typecheck, hash del commit.
