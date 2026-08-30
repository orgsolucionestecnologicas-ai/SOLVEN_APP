# FIX-15 — 7 bugs menores confirmados (Reportes, Ajustes, POS, Cierre de Caja)

> Origen: hallazgos de `TAREAS/QA_REPORTE.md` (QA-CHROME-01), verificados uno por uno contra el código real por el Ingeniero Líder (30-08-2026). Todos de bajo riesgo — cada uno es una causa raíz puntual y acotada, sin tocar lógica de cálculo de dinero ni de stock. Se pueden hacer en cualquier orden, incluso en paralelo.

## 1 — Categoría de producto incorrecta en Reportes
`src/app/ui/reports.tsx:129-158` (`CATEGORY_KEYWORDS`/`getProductCategory`) adivina la categoría por coincidencia de palabras clave en el nombre del producto, ignorando el campo real `product.categoryName`. Usado en líneas ~1988-1989, ~2423, ~3411-3412. **Fix:** usar `categoryName` real del producto en vez del heurístico de texto.

## 2 — "Mi Negocio" muestra "0/8 campos" para usuarios no-Owner (403 silencioso)
`src/app/api/settings/route.ts:21` exige `requireRole(["OWNER"], "settings")` — cualquier no-Owner recibe 403 sin `data`. `src/app/settings/components/NegocioPanel.tsx:20-29` no maneja el error y hace `setSettings(body.data ?? {})`, cayendo a `{}` — la UI interpreta eso como "0/8 campos completados" en vez de "sin acceso". **Fix:** manejar el 403 explícitamente en `NegocioPanel` (mostrar mensaje de "no tenés acceso a esta sección", no una barra de progreso en 0). No tocar el `requireRole` en sí — es intencional que sea OWNER-only, el bug es solo el mensaje engañoso.

## 3 — Placeholder de "mensaje de agradecimiento" se ve como texto real
`src/app/ui/settings.tsx:511` inicializa `receiptThankYouMessage` con `useState("¡Gracias por su compra!")` — el valor real arranca igual al placeholder, por eso el navegador nunca lo pinta en gris (el placeholder solo se ve cuando `value` está vacío). **Fix:** inicializar en `""` y aplicar el default `"¡Gracias por su compra!"` solo al guardar si el campo quedó vacío.

## 4 — Campo SKU dice "se generará al guardar" pero bloquea el guardado si está vacío
`src/app/ui/product-form.tsx:207` (`validate()`) exige SKU no vacío, y el input tiene `required` (línea 371), contradiciendo el texto de ayuda de las líneas 384-392 ("Se generará al guardar"). **Fix:** elegir una de las dos — o `validate()` autogenera el SKU si está vacío (usando la misma lógica de `handleGenerateSku`, línea 199-203), o se corrige el texto de ayuda para decir que hay que completarlo o usar el botón "Auto".

## 5 — Carrito del POS se borra sin confirmación (uno de los dos botones)
`src/app/ui/pos.tsx:2100-2107` (ícono de basura junto a "Promociones" en el header del carrito) hace `onClick={() => setCartItems([])}` directo, sin `window.confirm`. El otro botón de limpiar ("Limpiar venta", líneas 1974-1978 → `handleLimpiarVenta`) sí pide confirmación. **Fix:** que el botón de la papelera también pase por `handleLimpiarVenta` (o su propio `confirm`), no vaciar el carrito directo.

## 6 — "Devoluciones" no se refleja en el resumen de Cierre de Caja
`src/app/ui/cash-register-close.tsx:698` tiene `(-) Devoluciones` con el monto **hardcodeado en `fmt(0)`**, y la tarjeta de resumen relacionada (líneas 435-441) ya está marcada "Devoluciones (próx.)" con opacidad reducida — es una funcionalidad que quedó a medio conectar. **Fix:** calcular la suma real de devoluciones de la sesión de caja abierta (mismo dato que ya usa correctamente Movimientos de Caja) y reemplazar el `fmt(0)` hardcodeado.

## 7 — Indicador de caja en el sidebar no se actualiza tras un cierre exitoso
`src/app/ui/cash-register-close.tsx:295` dispara `window.dispatchEvent(new Event("cash-register-closed"))` al cerrar caja, pero **no existe ningún listener de ese evento en todo el código** (confirmado por grep). `CashRegisterIndicator` (`src/app/ui/app-shell.tsx:357-408`) solo hace fetch al montar. **Fix:** agregar un `addEventListener("cash-register-closed", ...)` en `CashRegisterIndicator` que dispare un refetch del estado de caja (y considerar hacer lo mismo para la apertura de caja, si tiene un evento equivalente o si conviene agregarlo).

## Validación y cierre
`typecheck`/`lint`/`test` sin errores. Reportar en `TAREAS/REPORTE_DE_CAMBIOS.md` (sin frases de autoverificación). Commit + push a GitHub al final — dado que son 7 fixes independientes, está bien dividir en varios commits si es más cómodo de revisar.
