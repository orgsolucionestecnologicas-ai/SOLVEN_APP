# Reporte de agente — IVA por producto: desglose en facturas (Argentina)

## Cambio 1 — Schema: `ivaRate` en `Product`
**Archivo:** `prisma/schema.prisma`
- Agregado `ivaRate Float @default(0.21)` después de `salePrice`.
- Migración `20260608181926_add_product_iva_rate` aplicada sin errores (`npx prisma migrate dev`).
Resultado: OK.

## Cambio 2 — Validación: `product-validation.ts`
**Archivo:** `src/modules/products/product-validation.ts`
- Agregado `IVA_RATES = [0, 0.105, 0.21, 0.27]` y tipo `IvaRate`.
- `CreateProductInput`/`ValidatedProductInput`/`UpdateProductInput`: agregado `ivaRate`.
- `validateCreateProductInput`: valida la alícuota contra `IVA_RATES` (default `0.21` si es inválida) y la incluye en el resultado.
- `validateUpdateProductInput`: maneja `ivaRate` opcional con la misma validación.
- Exportados `IVA_RATES`/`IvaRate` desde `src/modules/products/index.ts`.
- Actualizado `product-validation.test.ts` (el test "accepts valid product input" ahora espera `ivaRate: 0.21` en el resultado).
Resultado: OK.

## Cambio 3 — UI: selector de IVA en formulario de producto
**Archivo:** `src/app/ui/products-inventory.tsx`
- `ProductRecord`: agregado `ivaRate: number`.
- `CreateProductModal` y `EditProductModal`: agregado estado `ivaRate`, incluido en el `body` del submit, selector "Alícuota de IVA" (21% / 10,5% / 27% / 0% Exento) después de "Precio de venta", y preview en tiempo real con precio final / neto / monto IVA (o "Producto exento de IVA" cuando la alícuota es 0%).
Resultado: OK.

## Cambio 4 — POS: `ivaRate` en el carrito
**Archivo:** `src/app/ui/pos.tsx`
- `ProductRecord` y `CartItem`: agregado `ivaRate: number`.
- `addToCart`: pasa `ivaRate: Number(product.ivaRate) ?? 0.21` al crear el ítem.
- `addServiceToCart`: agrega `ivaRate: 0.21` por defecto a los servicios.
Resultado: OK.

## Cambio 5 — Comprobante e ticket con desglose de IVA
**Archivo:** `src/app/ui/pos.tsx`
- `handlePrintInvoice` reescrita: tabla con columnas Producto/Cant./P.Unit. Neto/Subtotal Neto/Alíc. IVA/IVA/Total c/IVA, fila de subtotal neto, filas de IVA agrupadas por alícuota, fila de descuento (si aplica), total final, y nota "Los precios incluyen IVA. Documento no válido como factura fiscal." con IVA total y neto gravado.
- `handlePrintTicket`: agregada la línea "IVA incluido en los precios" al pie del ticket.
Resultado: OK.

## Validación
- `npx prisma migrate dev --name add-product-iva-rate`: migración aplicada sin errores
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 180/180 tests pasan
- `npm run build`: compila sin errores

## Notas
- `salePrice` no cambió de significado: sigue siendo el precio final con IVA incluido; el desglose se calcula solo al momento de emitir el comprobante.
- Productos existentes quedan con `ivaRate = 0.21` por el `@default` de la migración.

## Commit
`feat(products): IVA por producto con desglose en comprobantes — alícuotas AFIP, migración schema, preview en formulario`
