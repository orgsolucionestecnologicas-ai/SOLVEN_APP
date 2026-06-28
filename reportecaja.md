# Reporte — Modal de cobro: dropdown primero + helper de efectivo compacto

Fecha: 2026-06-28
Orden ejecutada: cambioscaja.md ("Modal de cobro — filas con dropdown", 2da versión)

## Resumen
Se ajustó el orden de cada fila del modal de cobro: ahora es
`[método ▾] + [$ monto] + [✕]` (antes el monto iba primero). El bloque de
"Recibido / Vuelto" de Efectivo se simplificó a una sola línea compacta.
El selector de cliente se sacó del modal y volvió a la barra lateral, para
poder elegirlo antes de abrir el cobro.

## Cambios
- `src/app/ui/pos.tsx`:
  - Filas de pago: se invirtió el orden a método-dropdown primero (`flex-1`)
    y monto después (`w-36` fijo); tamaños de ícono/inputs ajustados.
  - Helper de Efectivo: una sola fila con "Recibido" + input + "Vuelto $X"
    en línea, reemplazando el bloque de dos filas anterior ("Cambio").
  - Selector de cliente: se quitó por completo del modal y se restauró en
    la barra lateral (entre Totales y el botón Cobrar) — obligatorio
    (`Cliente *`) cuando hay un split Fiado activo, opcional (búsqueda) en
    el resto, igual lógica que antes del modal.
  - El quick-action "Buscar cliente" ya no abre el modal de cobro; solo
    despliega la búsqueda de cliente en la barra lateral.
  - El botón "Confirmar cobro" del modal conserva el bloqueo
    `hasFiado && !selectedCustomerId` como red de seguridad (la orden no lo
    pedía explícitamente, pero quitar este chequeo permitiría confirmar una
    venta Fiado sin cliente, que `submitSale()` rechazaría de todas formas
    con un error — se mantiene para evitar ese paso en falso).

## Observaciones
- Gap detectado y resuelto con el usuario: la orden pedía que el cliente
  se eligiera "en la pantalla principal antes de cobrar", pero ese selector
  ya no existía ahí (se había movido al modal en la orden anterior). Se
  preguntó y el usuario eligió restaurar el selector completo (obligatorio +
  opcional) en la barra lateral — implementado así.
- Flujo resultante para Fiado: el cajero busca/selecciona el cliente desde
  "Buscar cliente" en la barra lateral (o llega con `?customerId=` desde la
  ficha del cliente) y luego abre "Cobrar" y cambia una fila a Fiado.
- BLOQUE 1-8 de la orden ya estaban satisfechos por la ejecución anterior;
  sin cambios en Prisma, validación ni persistencia de `paymentDetails`.
- Un test de integración (`sale-data-access.integration.test.ts`) falló por
  un corte transitorio de conexión a Neon; se re-ejecutó solo y pasó — no
  relacionado con los cambios de esta orden (UI únicamente).

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 200 tests pasados, 2 skipped (1 falla transitoria de red en la
  primera corrida, confirmada como no reproducible al re-ejecutar)
