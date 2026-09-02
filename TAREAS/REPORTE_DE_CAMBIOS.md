# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## 2026-09-02 — REPORTE-FIX-01..07 (Reportes / Facturación ARCA)

Commit `107ae44`. Orden ejecutada tal como quedó en `ordenestest.md` bajo "Reportes / Facturación (ARCA) — auditado 02-09-2026".

### REPORTE-FIX-01 (ALTO) — Race condition en doble emisión de factura
`src/modules/invoices/invoice-data-access.ts` — `emitInvoice`. Antes: se consultaba `getLastVoucherNumber`, se pedía el CAE a AFIP y recién al final se hacía `prisma.invoice.create`; entre el check inicial de "¿ya existe factura para esta venta?" y ese `create` final había una ventana donde dos requests concurrentes para la misma venta podían pasar ambos el check, pedir CAE dos veces (gastando dos números de comprobante reales en AFIP) y solo el `create` final iba a chocar con el `@unique` de `saleId` — dejando un CAE válido "huérfano" del lado de AFIP sin fila en la DB.
Fix: se separó la construcción del voucher en `buildNextVoucher()` (consulta `getLastVoucherNumber` + `buildARCAVoucher`) y ahora el flujo es: construir el voucher → `prisma.invoice.create` con fila "reservada" (`cae: ""`, `caeFchVto: ""`, con el resto de los campos ya reales: `voucherNumber`, `impTotal`, `impNeto`, `impIVA`, `impOpEx`) → recién ahí `requestCAE` a AFIP → `prisma.invoice.update` completando `cae`/`caeFchVto`/`voucherNumber` reales. Si el `create` de reserva choca contra el `@unique` de `saleId` (`Prisma.PrismaClientKnownRequestError` código `P2002`), se relee la factura ganadora y se lanza `ARCAError` con su CAE, sin haber llamado a AFIP. Si `requestCAE` falla (incluso tras el reintento de FIX-02), la fila reservada se borra en un `catch` (`prisma.invoice.delete`, best-effort) antes de relanzar el error — no queda basura en la tabla `Invoice`.

### REPORTE-FIX-02 (MEDIO) — Reintento automático por número de comprobante ya usado
Mismo archivo/función. Se agregó la constante `AFIP_VOUCHER_NUMBER_TAKEN_CODE = "10016"` (código WSFE de "el comprobante ya fue autorizado"). Si `requestCAE` lanza `ARCAEmissionError` con ese código, se vuelve a llamar `buildNextVoucher()` (reconsulta el último número real a AFIP) y se reintenta `requestCAE` una sola vez con el nuevo voucher; cualquier otro código de error se propaga sin reintentar. No se tocó `wsfe-client.ts` ni `arca-errors.ts` — el manejo quedó centralizado en `emitInvoice`.

### REPORTE-FIX-03 (MEDIO) — Horario de Argentina en reportes exportados
`src/app/api/reports/export/route.ts` y `src/app/api/reports/export-pdf/route.tsx`. El rango de fechas se construía con `new Date(`${fromParam}T00:00:00`)` / `...T23:59:59.999`, que Node interpreta en la zona horaria del proceso — en Vercel eso es UTC, no Argentina (`-03:00`, sin DST desde 2009). Un filtro "hoy" podía excluir/incluir ventas de las 21-24hs AR según el desfase. Fix: ambos límites ahora llevan el offset explícito (`...T00:00:00-03:00` / `...T23:59:59.999-03:00`).

### REPORTE-FIX-04 (MEDIO-BAJO) — `getInvoiceBySaleId` sin scope de tenant
`src/modules/invoices/invoice-data-access.ts`. Firma pasó de `getInvoiceBySaleId(saleId)` con `prisma.invoice.findUnique({ where: { saleId } })` a `getInvoiceBySaleId(saleId, tenantId)` con `prisma.invoice.findFirst({ where: { saleId, tenantId } })`. No tenía llamadores activos en el resto del código (solo se reexportaba desde `src/modules/invoices/index.ts`); se corrigió preventivamente antes de que se use en un endpoint real.

### REPORTE-FIX-05 (BAJO-MEDIO) — Permisos de exportación de reportes
`src/app/api/reports/export/route.ts` y `export-pdf/route.tsx`. `GET` pasó de `requireTenantId()` (cualquier usuario autenticado del tenant, sin importar rol) a `requireRole(["OWNER"])`. `export-pdf` no usaba las respuestas compartidas de `_shared/responses`, así que se agregó un 403 (`new NextResponse("Forbidden", { status: 403 })`) para `ForbiddenError`, análogo al 401 ya existente.

### REPORTE-FIX-06 (MEDIO) — Vencimiento de certificado ARCA
`src/lib/arca/wsaa-client.ts` — nueva función `getCertExpiryInfo(tenantId)`: desencripta el certificado del tenant (`decryptCert`), lo parsea con `forge.pki.certificateFromPem` y lee `cert.validity.notAfter`, devolviendo `{ notAfter, daysRemaining }` (o `null` si no hay certificado cargado). Reexportada desde `src/lib/arca/index.ts`. `GET /api/invoices/test` (`src/app/api/invoices/test/route.ts`) ahora incluye `certExpiresAt` (ISO string o `null`) y `certDaysRemaining` en la respuesta. No se implementó el warning de frontend en Ajustes/ARCA ni el email proactivo — la orden los marcaba como "opcional" y no se incluyeron en esta pasada.

### REPORTE-FIX-07 (BAJO) — Auditoría de emisión de factura
`src/modules/audit/audit-data-access.ts` — se agregó `"INVOICE_EMITTED"` al union `AuditAction`. `src/app/api/invoices/route.ts` (`POST`) ahora captura `userId` de `requireRole` y llama `void logAudit({ tenantId, userId, action: "INVOICE_EMITTED", entityType: "Invoice", entityId: invoice.id, metadata: { saleId, cae, voucherNumber } })` después de que `emitInvoice` resuelve — mismo patrón fire-and-forget usado en `QUOTE_CONFIRMED`.

### Tests
- `src/modules/invoices/invoice-data-access.test.ts`: reescrito para el nuevo flujo reserva→AFIP→completar. Mock de `prisma.invoice` ampliado con `findFirst`/`update`/`delete`. Tests nuevos: reserva antes de llamar a AFIP y completa con el CAE real (con aserción de orden de invocación `create` antes que `requestCAE`), rechazo por carrera concurrente (`P2002` en el `create` de reserva → relee y devuelve el CAE ganador sin llamar a AFIP), reintento único ante código `10016`, limpieza de la reserva (`invoice.delete`) cuando AFIP rechaza por otro motivo sin reintentar. Se agregó `describe("getInvoiceBySaleId")` verificando el scope por tenant.
- `src/app/api/invoices/route.test.ts`: agregado mock de `@/modules/audit` (antes ausente — con el `logAudit` real habría pegado contra Prisma real en el test); test del happy-path ahora también verifica la llamada a `logAudit` con `action: "INVOICE_EMITTED"`.
- `src/app/api/reports/export/route.test.ts` y `export-pdf/route.test.ts`: mock cambiado de `requireTenantId` a `requireRole`; agregado test de 403 para rol no-OWNER en ambos.

### Validación
`npm run lint` → 0 errores. `npm run typecheck` → 0 errores. `npm test` → 450 passed / 1 failed / 2 skipped (453 total). La única falla fue `src/modules/inventory/stock-adjustment.integration.test.ts > adjustProductStock > records an audit log entry for the adjustment` — módulo no tocado en este cambio (`git status` confirmó cero diffs en `src/modules/inventory/` antes de commitear); se corrió aislado (`npx vitest run` solo ese archivo) y pasaron los 4 tests, confirmando que es una falla intermitente preexistente contra la integración real con Neon, no una regresión introducida acá. No se ejecutó nada contra el ambiente de producción de AFIP — los tests siguen mockeando WSAA/WSFE como ya estaba.

No autocertificado como "verificado" — queda a criterio del Ingeniero Líder revisar contra el diff real.
