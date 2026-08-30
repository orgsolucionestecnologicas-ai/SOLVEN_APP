# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## FIX-15 — 7 bugs menores (Reportes, Ajustes, POS, Cierre de Caja)

**1 — Categoría real en Reportes.** `reports.tsx` calculaba la categoría de cada producto con un heurístico de palabras clave (`CATEGORY_KEYWORDS` / `getProductCategory`) que ignoraba el campo real. Ahora usa `product.categoryName`. Se eliminó el heurístico, se actualizaron los 6 puntos de uso (donut de categorías, indicadores clave, ProductosTab, InventarioTab, RentabilidadTab, TopProductosTab) y se alinearon los colores de `CHART_ENTRIES` a las categorías reales (Alimentos, Bebidas, Lácteos, Limpieza, Cuidado Personal, Hogar, Panadería, Snacks, Otros). Para que las ventas expongan la categoría, se agregó `categoryName` al `select` del producto en `listSales` (`sale-data-access.ts`) y a los tipos correspondientes.
- `src/app/ui/reports.tsx`
- `src/modules/sales/sale-data-access.ts`

**2 — "Mi Negocio" mostraba 0/8 campos a usuarios no-Owner.** `/api/settings` responde 403 a los no-Owner; `NegocioPanel` caía a `{}` y pintaba una barra de progreso en 0%. Ahora detecta el 403 y muestra un mensaje de "no tenés acceso a esta sección" en lugar de la barra y del formulario. El `requireRole(["OWNER"])` no se tocó.
- `src/app/settings/components/NegocioPanel.tsx`

**3 — Placeholder de mensaje de agradecimiento se veía como texto real.** El estado inicial de `receiptThankYouMessage` era `"¡Gracias por su compra!"`, por lo que el placeholder gris nunca se mostraba. Ahora inicializa en `""` (y al cargar settings vacío queda en `""`), y el default `"¡Gracias por su compra!"` se aplica solo al guardar si el campo quedó vacío.
- `src/app/ui/settings.tsx`

**4 — SKU bloqueaba el guardado pese a decir "se generará al guardar".** El backend autogenera el código (`PROD-0001`) y el valor tipeado no se envía, pero el input era `required` y `validate()` lo exigía. Se quitó el `required` del input y la validación obligatoria del SKU; el texto de ayuda (que ya decía que se genera al guardar) queda coherente y el botón "Auto" sigue disponible.
- `src/app/ui/product-form.tsx`

**5 — Papelera del carrito del POS vaciaba sin confirmar.** El ícono de basura junto a "Promociones" hacía `setCartItems([])` directo. Ahora pasa por `handleLimpiarVenta`, que pide confirmación igual que el botón "Limpiar venta".
- `src/app/ui/pos.tsx`

**6 — "Devoluciones" hardcodeada en el Cierre de Caja.** La tarjeta "Devoluciones (próx.)" y la línea "(-) Devoluciones" mostraban `0` fijo. Ahora suman los movimientos de caja de la sesión con `type: OUT` y `source: RETURN` (el mismo dato de Movimientos de Caja). El "Total esperado" no cambia: ya descontaba las devoluciones vía `totalCashOut`, así que solo se corrigió lo mostrado, sin doble descuento.
- `src/app/ui/cash-register-close.tsx`

**7 — Indicador de caja del sidebar no se refrescaba tras cerrar/abrir.** `cash-register-close.tsx` disparaba el evento `cash-register-closed` pero nadie lo escuchaba. Se extrajo la carga de estado de `CashRegisterIndicator` a `loadStatus` y se agregaron listeners de `cash-register-closed` y `cash-register-opened`; el flujo de apertura ahora también emite `cash-register-opened`.
- `src/app/ui/app-shell.tsx`
- `src/app/ui/cash-register-open.tsx`

Validación: `npm run typecheck`, `npm run lint`, `npm test` (324 passed / 2 skipped).

---
