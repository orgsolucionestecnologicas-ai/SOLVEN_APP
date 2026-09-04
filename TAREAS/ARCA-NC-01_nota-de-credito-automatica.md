# ARCA-NC-01 — Nota de Crédito automática al procesar una devolución

> Rama: `main`. Este cambio toca `prisma/schema.prisma` y `src/lib/arca/*` — por eso NO va en `design/revision-uiux-sep-2026` (esa rama tiene explícitamente prohibido tocar `src/lib/arca/*`, viene de una decisión anterior para no mezclar rediseño de UI con lógica fiscal). Investigación de código ya hecha por el Ingeniero Líder — referencias verificadas contra el HEAD actual de `main` (commit `ac3fb0a`).

**Contexto de negocio (por qué esto existe):** hoy, cuando se devuelve un producto de una venta que tiene Factura ARCA emitida, no pasa nada del lado fiscal — la factura original queda "colgada" por un monto que ya no es real. Se decidió con Diego (fundador) que: (1) un cambio de producto sigue siendo dos operaciones manuales separadas — devolución + venta nueva — no se unifica en una pantalla; (2) la Nota de Crédito se emite sola, en el momento, sin que el cajero tenga que hacer una acción aparte; (3) investigado cómo lo hace un software de gestión profesional y AFIP mismo: la NC va **solo por el ítem devuelto** (no por la factura completa), tiene que referenciar la factura original vía `CbteAsoc` (obligatorio desde RG 4540/19), los datos del receptor tienen que coincidir exactamente con los de la factura original, y tiene que emitirse dentro de los 15 días corridos del hecho que la origina — todo esto se cumple automáticamente si se emite en el momento de la devolución, usando los datos ya guardados en la factura original.

**No tocar:** `src/lib/arca/token-cache.ts`, `src/lib/arca/arca-errors.ts`, la lógica de emisión de Factura normal (`emitInvoice`, `getVoucherType`, el flujo de `POST /api/invoices`) — todo eso queda tal cual, esto se agrega al lado, no lo reemplaza. Tampoco toques `src/app/api/sales/[id]/route.ts` ni nada de `src/app/ui/pos.tsx` fuera de lo que se pide en la Sección 6.

---

## Sección 1 — Schema (`prisma/schema.prisma`)

Cambios aditivos, todos nullable u opcionales — no rompen datos existentes.

1. Nuevo enum:
   ```prisma
   enum InvoiceKind {
     FACTURA
     NOTA_CREDITO
   }
   ```

2. En `model Invoice` (línea ~698), agregar:
   - `kind InvoiceKind @default(FACTURA)`
   - `returnId String? @unique`
   - `return Return? @relation(fields: [returnId], references: [id])`
   - `cbteAsocTipo Int?`
   - `cbteAsocPtoVta Int?`
   - `cbteAsocNro Int?`

   El resto del modelo (`cae`, `caeFchVto`, `voucherNumber`, `voucherType`, `puntoVenta`, `docTipo`, `docNro`, `impTotal`, `impNeto`, `impIVA`, `impOpEx`) se reutiliza tal cual para la NC — es la misma forma de comprobante, solo cambia `kind` y los tres campos `cbteAsoc*`. No crear un modelo `CreditNote` aparte, sería duplicar todo el flujo de reserva/CAE que ya existe y funciona en `emitInvoice`.

3. En `model Return` (línea ~530), agregar la relación inversa: `invoice Invoice?` (sin `@relation` explícito, Prisma la infiere del lado de `Invoice.return`).

4. Migración: nombre descriptivo tipo `add_invoice_credit_note_fields`. Aplicar contra Neon como siempre (`npx prisma migrate dev` en local si corresponde, o el flujo que ya usás). Verificable después con una consulta de solo lectura contra la tabla `Invoice` para confirmar las columnas nuevas.

## Sección 2 — `src/lib/arca/voucher-builder.ts`

1. Agregar una función nueva:
   ```ts
   // Mapeo de tipo de comprobante original → tipo de Nota de Crédito asociado.
   // 1=Factura A→3=NC A, 6=Factura B→8=NC B, 11=Factura C→13=NC C.
   // ⚠️ Verificar estos códigos contra la tabla oficial de AFIP
   // (https://www.afip.gob.ar/fe/documentos/TABLACOMPROBANTES.xls) antes de
   // emitir en ambiente "prod" — probar primero contra "homo".
   export function getCreditNoteVoucherType(originalVoucherType: number): number {
     const map: Record<number, number> = { 1: 3, 6: 8, 11: 13 };
     const nc = map[originalVoucherType];
     if (!nc) {
       throw new Error(`No hay tipo de Nota de Crédito mapeado para voucherType ${originalVoucherType}`);
     }
     return nc;
   }
   ```

2. Extender `ARCAVoucherData` (línea ~14) con un campo opcional:
   ```ts
   cbteAsoc?: { tipo: number; ptoVta: number; nro: number };
   ```

3. `buildARCAVoucher` (línea ~49) necesita dos parámetros opcionales nuevos al final de la firma: `voucherTypeOverride?: number` y `cbteAsoc?: { tipo: number; ptoVta: number; nro: number }`. Cuando `voucherTypeOverride` está presente, se usa en vez de `getVoucherType(condicionIVA, docTipo)` para el campo `voucherType` del resultado. Cuando `cbteAsoc` está presente, se copia tal cual al resultado. El resto de la función (agrupación de IVA, cálculo de `impNeto`/`impOpEx`/`impIVA`, `impTotal`) se reutiliza exactamente igual — no dupliques esa lógica en ningún lado nuevo, es la misma matemática de prorrateo que ya sirve para facturas normales.

## Sección 3 — `src/lib/arca/wsfe-client.ts`

En `requestCAE` (línea ~105), agregar el bloque `CbtesAsoc` al XML del `FECAEDetRequest` solo cuando `voucher.cbteAsoc` esté presente:

```ts
const cbtesAsocXml = voucher.cbteAsoc
  ? `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${voucher.cbteAsoc.tipo}</ar:Tipo><ar:PtoVta>${voucher.cbteAsoc.ptoVta}</ar:PtoVta><ar:Nro>${voucher.cbteAsoc.nro}</ar:Nro></ar:CbteAsoc></ar:CbtesAsoc>`
  : "";
```

Insertarlo en `detReq` **después** de `<ar:MonCotiz>...</ar:MonCotiz>` y **antes** de `ivaXml` — ese es el orden de elementos que espera el schema SOAP de WSFE (`FECAEDetRequest`), no lo pongas en otro lugar del XML o AFIP puede rechazar la solicitud por schema inválido.

`getLastVoucherNumber` no necesita cambios — ya es genérica para cualquier `voucherType`, incluidos los de NC.

## Sección 4 — Emisión: `emitCreditNoteForReturn`

Nueva función en `src/modules/invoices/invoice-data-access.ts` (mismo archivo que `emitInvoice`, para reutilizar sus imports e infraestructura) o un archivo nuevo `src/modules/invoices/credit-note-data-access.ts` si preferís separarlo — tu criterio, pero si lo separás reexportalo desde `src/modules/invoices/index.ts` igual que `emitInvoice`.

```ts
export async function emitCreditNoteForReturn(
  returnId: string,
  tenantId: string
): Promise<EmittedInvoice | null>
```

Lógica:

1. Buscar el `Return` por `id`, con `items` incluidos, y su `sale` (con `items` incluyendo `product`/`service` para nombre, y con `tenantId`, `discountAmount`, `totalAmount`). Si no existe o el `sale.tenantId !== tenantId`, lanzar error (mismo patrón de aislamiento por tenant que usa `emitInvoice` con `saleId`).

2. Guard de idempotencia: si ya existe un `Invoice` con `returnId` igual a este, devolverlo tal cual en vez de re-emitir (mismo espíritu que el guard de `saleId` en `emitInvoice`, línea ~41).

3. Buscar la factura original con `getInvoiceBySaleId(sale.id, tenantId)`. **Si no existe** (la venta original era ticket, sin ARCA), devolver `null` — no es un error, simplemente no hay nada que acreditar fiscalmente. Esto es clave: la devolución en sí (stock, caja, deuda) ya se procesó en `processReturn` sin depender de esto, y tiene que seguir funcionando igual para tenants sin ARCA o ventas por ticket.

4. Armar los items de la NC a partir de `Return.items` (`ReturnItem`: `productId`, `quantity`) cruzados contra `sale.items` (para `unitPrice`, `ivaRate`, nombre de producto/servicio) — **igual que hace `emitInvoice` con los items de la venta**, pero solo con los productos devueltos. Importante: el `unitPrice` que le pasás a `buildARCAVoucher` para cada item tiene que ser el precio prorrateado por el descuento de la venta (la misma fórmula que ya existe como función privada `proratedUnitPrice` en `src/modules/returns/index.ts`, línea ~226) — no el `unitPrice` crudo del `SaleItem`. Si no lo prorrateás, el `impTotal` que calcula `buildARCAVoucher` no va a coincidir con `Return.totalAmount`, que sí está prorrateado. Exportá `proratedUnitPrice` desde `modules/returns` (agregale `export`) e importala acá en vez de reescribir la fórmula.

5. `voucherTypeOverride = getCreditNoteVoucherType(originalInvoice.voucherType)`.

6. `cbteAsoc = { tipo: originalInvoice.voucherType, ptoVta: originalInvoice.puntoVenta, nro: originalInvoice.voucherNumber }`.

7. `docTipo`/`docNro` del comprobante nuevo: **tomalos de `originalInvoice`, no los recalcules ni los pidas de nuevo** — el punto de la RG es que los datos del receptor de la NC coincidan exactamente con los de la factura original.

8. De acá en adelante, el flujo es el mismo patrón que `emitInvoice` (línea ~97 en adelante): reservar la fila (`prisma.invoice.create` con `cae: ""`, `kind: "NOTA_CREDITO"`, `returnId`, `cbteAsocTipo/PtoVta/Nro`, y los importes que devuelva `buildARCAVoucher`) **antes** de llamar a AFIP — el `@unique` en `returnId` te protege contra una doble emisión concurrente igual que `@unique` en `saleId` protege a `emitInvoice`. Después `requestCAE`, con el mismo reintento único ante el código `10016` (número de comprobante ya tomado) que ya maneja `emitInvoice`. Si AFIP falla, borrar la fila reservada (`prisma.invoice.delete`) igual que hace `emitInvoice`.

9. Registrar auditoría con `logAudit` (mismo módulo que ya se usa en el resto del proyecto), acción `CREDIT_NOTE_EMITTED`, `entityType: "Invoice"`, con `returnId`/`saleId`/`cae` en `metadata` — esto va en el call site (Sección 5), no acá adentro, para mantener esta función sin dependencia de auditoría.

**Punto de atención — no lo resuelvas de forma distinta a como está acá:** esta función **no** va envuelta en el `prisma.$transaction` de `processReturn` (esa transacción es `Serializable` con timeout de 15s y bloquea filas de `Product`/`CashMovement`/`Debt` — una llamada HTTP a AFIP adentro de esa transacción puede tardar varios segundos y arriesga el timeout o mantiene locks innecesarios). Se llama **después** de que `processReturn` ya devolvió éxito, como un paso separado — ver Sección 5.

## Sección 5 — Enganche en `POST /api/returns` (`src/app/api/returns/route.ts`)

Después de que `processReturn(...)` resuelve con éxito (línea ~152) y del `logAudit` de `RETURN_CREATED` (línea ~159), y **antes** de `successResponse(result, 201)` (línea ~171):

```ts
let creditNote = null;
let creditNoteError: string | null = null;
try {
  const cn = await emitCreditNoteForReturn(result.returnId, tenantId);
  if (cn) {
    creditNote = cn;
    void logAudit({
      tenantId,
      userId,
      action: "CREDIT_NOTE_EMITTED",
      entityType: "Invoice",
      entityId: cn.id,
      metadata: { returnId: result.returnId, saleId: result.saleId, cae: cn.cae }
    });
  }
} catch (e) {
  creditNoteError = e instanceof ARCAError ? e.message : "No se pudo emitir la Nota de Crédito.";
}

return successResponse({ ...result, creditNote, creditNoteError }, 201);
```

**Esto es innegociable:** si `emitCreditNoteForReturn` falla, la devolución **igual tiene que responder 201** — la devolución (stock, caja, deuda) ya se guardó en `processReturn` y es válida por sí sola, con o sin ARCA. Esto mantiene la misma filosofía que ya existe en todo el proyecto (ticket siempre disponible, factura es opt-in) — una devolución nunca debería fallar por un problema de AFIP. `creditNoteError` viaja en la respuesta para que el frontend, si quiere, avise al cajero de que la devolución se hizo pero la NC no se pudo emitir (podés simplemente mostrar un toast si `creditNoteError` no es null — no hace falta una pantalla de reintento en esta orden, eso puede quedar en `PENDIENTES.md` como ítem aparte si te parece que hace falta).

## Sección 6 (opcional, si el tiempo da) — Reflejar la NC real en el PDF interno

Hoy `src/app/ui/return-credit-note-pdf.tsx` genera un PDF de "Nota de crédito" que es puramente interno (no lleva CAE ni QR, no es un comprobante fiscal real — así lo dejamos documentado en `PENDIENTES.md` como brecha conocida). Con esta orden ejecutada, cuando la devolución sí generó una NC real con CAE, ese PDF debería mostrar los datos reales (CAE, vencimiento, tipo/pto.vta/número de comprobante) y el QR de AFIP, con el mismo formato que ya usa `src/app/ui/pos.tsx` (línea ~3643-3667) para las facturas normales — mismo `payload` (`ver`, `fecha`, `cuit`, `ptoVta`, `tipoCmp`, `nroCmp`, `importe`, `moneda`, `ctz`, `tipoDocRec`, `nroDocRec`, `tipoCodAut`, `codAut`), misma URL `https://www.arca.gob.ar/fe/qr/?p=${encoded}`, mismo encoding base64url. Si la devolución no generó NC real (ticket sin ARCA), el PDF se queda como está hoy, sin sección de CAE/QR. Si esta sección te toma mucho más que las 1-5, decime en el reporte y la dejamos para una orden aparte — no es bloqueante para el resto.

---

## Entregable

`typecheck`/`lint` en verde. Tests: agregá cobertura para `emitCreditNoteForReturn` en el mismo estilo que ya existe para `emitInvoice` (buscá sus tests actuales como referencia de mocks de WSFE) — como mínimo: NC se emite con el monto e items correctos cuando la venta original tiene factura; devuelve `null` sin error cuando la venta original es ticket; no re-emite si ya existe NC para ese `returnId`; el `POST /api/returns` responde 201 con la devolución aunque `emitCreditNoteForReturn` lance un error simulado. Migración aplicada y verificable contra Neon. Reportá en `TAREAS/REPORTE_DE_CAMBIOS.md`, indicando explícitamente si probaste la emisión real contra WSFE homologación (`ambiente: "homo"`) o solo mockeaste — si no la probaste contra homologación real, decilo así de claro, no lo des por sentado. Commit a `main`.
