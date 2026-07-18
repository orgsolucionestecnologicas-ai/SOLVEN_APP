# FIX-08 — ARCA: la factura no debe confiar en items/total que manda el cliente

> Prioridad máxima — encontrado por el Ingeniero Líder revisando `CLAUDE.md` sección 5 (bug ya documentado, nunca corregido) y confirmado leyendo el código real. A diferencia de los hallazgos del ciclo de QA (todos internos a SOLVEN), este toca un sistema externo: AFIP/ARCA. Una factura electrónica mal emitida no se puede "revertir" con un rollback — tiene consecuencias fiscales reales para el negocio de Diego. Tratar esto con el máximo cuidado: no romper el flujo de emisión real (WSAA/WSFE), solo cerrar el hueco de confianza en los datos de entrada.

## Diagnóstico exacto (ya confirmado, no re-investigar desde cero)

- `src/app/api/invoices/route.ts`, `POST` (línea 17-71): recibe del body `saleId`, `items`, `total`, `docTipo`, `docNro`, `concepto` y los pasa **tal cual** a `emitInvoice(...)` (línea 54-62). Solo valida que `items` sea un array no vacío y que `total` sea un número positivo — **nunca verifica que esos valores coincidan con la venta real**.
- `src/modules/invoices/invoice-data-access.ts`, `emitInvoice()` (línea 35-…): el único chequeo contra la base de datos es `prisma.invoice.findUnique({ where: { saleId } })` para evitar doble facturación (línea 37-40) — **nunca hace `prisma.sale.findFirst({ where: { id, tenantId } })`**. Usa `input.items` y `input.total` directamente para construir el comprobante real (`buildARCAVoucher`, línea 66-75) que se manda a AFIP (`requestCAE`, línea 78).
- Consecuencia concreta: cualquier usuario autenticado con rol `OWNER`/`CASHIER` puede mandar un `saleId` que no le pertenece (de otro tenant) junto con `items`/`total` inventados, y el sistema emite una factura electrónica real con CAE real de AFIP usando esos datos falsos — sin ninguna verificación cruzada contra lo que esa venta realmente fue.
- `CartItemForInvoice` (`src/lib/arca/voucher-builder.ts:1-6`) es `{ productName, quantity, unitPrice (con IVA incluido), ivaRate }` — mapea 1 a 1 con los campos de `SaleItem` (`productId`/`serviceId`, `quantity`, `unitPrice`, `ivaRate`) más el nombre del producto/servicio relacionado.
- **No existe ningún test hoy para `/api/invoices` ni para `emitInvoice`** (confirmado, no hay ningún archivo `*.test.ts` bajo `src/app/api/invoices/`) — hay que crear la cobertura desde cero como parte de este fix, no solo el código.

## Qué hacer

### 1. `src/modules/invoices/invoice-data-access.ts`
- Antes de construir el voucher, agregar: `const sale = await prisma.sale.findFirst({ where: { id: input.saleId, tenantId: input.tenantId }, include: { items: { include: { product: true, service: true } } } });` — si `sale` es `null`, lanzar un error claro (reusar `ARCAError` o el patrón de error ya usado en el módulo) tipo "La venta no fue encontrada para este comercio." Esto cierra el hueco de cross-tenant.
- Construir `items: CartItemForInvoice[]` **desde `sale.items`** (mapeando `product?.name ?? service?.name` a `productName`, y `quantity`/`unitPrice`/`ivaRate` directos de cada `SaleItem`) — no usar más `input.items` en ningún punto de la función.
- Usar `sale.totalAmount` como `total` para el voucher — no usar más `input.total`. Verificar (y documentar en el reporte) que la suma de los `items` recalculados reconcilia con `sale.totalAmount`; si hay descuentos (`sale.discountAmount`) que generan una diferencia esperada, documentar cómo se maneja para no romper el cálculo de IVA del comprobante.
- Actualizar el tipo `EmitInvoiceInput` (línea 13-21) quitando `items` y `total` — ya no deben ser parámetros de la función, para que sea imposible en el futuro volver a pasar datos del cliente por error. La función pasa a depender solo de `tenantId`, `saleId`, `docTipo`, `docNro`, `concepto`.
- No tocar la lógica de `getARCACredentials`, `buildARCAVoucher`, `requestCAE` ni el resto del flujo real de WSAA/WSFE — el fix es solo sobre el origen de los datos que alimentan ese flujo.

### 2. `src/app/api/invoices/route.ts`
- Quitar `items` y `total` de la lectura/validación del body (ya no se usan ni se confían).
- Mantener `docTipo`/`docNro`/`concepto` como entrada legítima del cliente (son datos del comprador para la factura, no datos de la venta) — pero validar que `docTipo` sea uno de los valores permitidos (`99` Consumidor Final, `96` DNI, `80` CUIT) en vez de aceptar cualquier número.
- Actualizar la llamada a `emitInvoice(...)` para que ya no reciba `items`/`total`.

### 3. Tests nuevos (no existían)
- Crear `src/modules/invoices/invoice-data-access.test.ts` (o `.integration.test.ts` si requiere DB real, siguiendo el patrón ya usado en otros módulos) cubriendo como mínimo: (a) `emitInvoice` recalcula items/total desde la venta real, ignorando lo que se le pase de más; (b) un `saleId` de otro tenant es rechazado; (c) doble facturación sigue bloqueada; (d) el resto del flujo (WSAA/WSFE) se sigue llamando igual que antes — mockear `getARCACredentials`/`buildARCAVoucher`/`requestCAE` para no pegarle a AFIP real en los tests.
- Crear `src/app/api/invoices/route.test.ts` cubriendo: 403 sin rol, 400 con `saleId`/`docTipo` inválido, 201 en el camino feliz (mockeando `emitInvoice`), y que el body ya no necesita ni acepta `items`/`total`.

## Restricciones estrictas

1. No tocar `src/lib/arca/*` (WSAA, WSFE, cert-crypto, token-cache, voucher-builder) — el fix es solo sobre el origen de los datos, no sobre cómo se arma o envía el comprobante.
2. No probar contra AFIP real (ni homologación) desde los tests — todo mockeado.
3. No cambiar el comportamiento para `docTipo`/`docNro`/`concepto` más allá de validar que `docTipo` sea uno de los 3 valores permitidos.
4. Si `sale.totalAmount` no reconcilia exactamente con la suma de items recalculados (por descuentos u otra razón), no inventar un ajuste — documentarlo en el reporte y usar `sale.totalAmount` como fuente de verdad (es el campo que ya usa el resto del sistema).

## Archivos afectados (esperados)

- `src/modules/invoices/invoice-data-access.ts`
- `src/app/api/invoices/route.ts`
- `src/modules/invoices/invoice-data-access.test.ts` (nuevo)
- `src/app/api/invoices/route.test.ts` (nuevo)

## Protocolo de reporte

1. `npm run typecheck` y `npm run lint` sin errores → `git add -A && git commit -m "fix: ARCA recalcula items/total desde la venta real, valida tenant (no confia en el payload del cliente)" && git push origin main`.
2. `npm test` — confirmar que los tests nuevos pasan y no hay regresiones.
3. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md`: qué se cambió en cada archivo, cómo se verificó la reconciliación de montos, resultado de typecheck/lint/tests, hash del commit.
4. Agregar una entrada corta (2-4 líneas) arriba de todo en `TAREAS/REPORTELIDER.md` (formato `### 2026-07-17 — FIX-08: [resumen]`) — sin borrar las entradas existentes.
5. Entregable en el chat: breve — remarcar explícitamente que items/total ya no vienen del cliente, y el resultado de los tests nuevos.
