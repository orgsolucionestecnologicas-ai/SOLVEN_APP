# REPORTE — Reparación Sección Caja
Fecha: 2026-06-25

## Fixes aplicados
- [FIX-01] src/app/ui/pos.tsx handleSubmit — se agrega `note` (desde `noteText`) al body del POST `/api/sales`. El API la ignora silenciosamente (no existe en el schema), no se persiste.
- [FIX-02] src/app/ui/pos.tsx handleSubmit — se agrega `operationNumber` (desde `cardOperationNumber`/`transferOperationNumber` según método de pago) al body del POST `/api/sales`. Mismo comportamiento: ignorado por el API, no se persiste.
- [FIX-03] src/app/ui/pos.tsx:787 (addToCart) — `ivaRate: Number(product.ivaRate) ?? 0.21` reemplazado por `ivaRate: product.ivaRate != null ? Number(product.ivaRate) : 0.21` (el `??` nunca se activaba porque `Number()` no retorna null/undefined).
- [FIX-04] src/app/ui/pos.tsx — quick action "Buscar cliente" cambiado de `setPaymentMethod("Fiado")` a `setOptionalCustomerOpen(true)`; ya no fuerza el método de pago a Fiado.
- [FIX-05] src/app/ui/pos.tsx — botón `MoreHorizontal` muerto en el header del POS (sin onClick) oculto con `hidden`.
- [FIX-06] src/app/ui/pos.tsx — agregado mensaje de guía ("Hacé clic en Nueva venta para comenzar") cuando `!saleGateResult && cartItems.length === 0`, antes de la condición del carrito vacío genérico.
- [FIX-08] src/app/ui/cash-movement-form.tsx — botón "Ayuda" (HelpCircle) sin función, oculto con `hidden`.
- [FIX-09] src/app/ui/cash-register-close.tsx — ícono `Trash2` reemplazado por `EyeOff` en el botón de ocultar gasto de la sesión (import actualizado). El `title` se mantuvo como "Ocultar de esta vista": la orden era contradictoria (pedía cambiar el texto a "Ocultar de esta sesión" pero aclaraba entre paréntesis "ya estaba bien el texto, solo cambiar el ícono"); se priorizó la aclaración y se aplicó cambio quirúrgico mínimo (solo ícono).
- [FIX-10] src/app/ui/cash-register-close.tsx — card `SalesSummaryCard label="Devoluciones"` cambiada a `label="Devoluciones (próx.)"`, `bgClass="bg-slate-50 opacity-50"`, `textClass="text-slate-400"` para indicar que no es un dato real disponible.
- [FIX-11] src/app/ui/cash-movements-list.tsx — 3 botones muertos ocultos con `hidden`: "Filtros avanzados", `MoreHorizontal` en filas de la tabla, "Ver todas las categorías →" en sidebar.
- [FIX-12] src/app/ui/cash-movements-list.tsx — botón "Exportar" cambiado de `onClick={() => window.print()}` a `onClick={() => alert("Exportar estará disponible próximamente.")}`.
- [FIX-13] src/app/ui/cash-register-open.tsx — botón "¿Cómo funciona la apertura de caja?" (HelpCircle) sin función, oculto con `hidden`.
- [FIX-14] src/app/ui/customer-payment-form.tsx — eliminadas las funciones `getCustomerPhone` y `getCustomerEmail` (generaban datos de contacto inventados). Se eliminó el párrafo `{phone} · {email}` del JSX (mostraba datos ficticios); ahora solo se muestra nombre y estado del cliente.
- [FIX-16] src/app/ui/customer-payment-form.tsx — texto hardcodeado "Efectivo" en el historial de pagos recientes reemplazado por "Pago registrado" (neutro, ya que el API no retorna el método real).
- [FIX-17] src/app/ui/customer-payment-form.tsx — `creditLimit` hardcodeado en `10000` reemplazado por `null` con `creditAvailable` condicional; el sidebar muestra "—" en "Límite de crédito" y "Disponible" cuando es `null`.

## Fixes omitidos (requieren cambio de schema/API)
- [FIX-07] src/app/ui/cash-movement-form.tsx — el formulario captura `fecha`, `hora`, `caja`, `cajero`, `metodoPago`, `requiereComprobante` y `observaciones`, pero `CreateCashMovementInput` (src/modules/cash/cash-movement-validation.ts) y el modelo `CashMovement` en Prisma solo soportan `{type, amount, source, referenceId}`. No se modificó el schema ni las migraciones (prohibido por la orden); estos campos quedan pendientes de soporte en el API.
- [FIX-15] src/app/ui/customer-payment-form.tsx — `method`, `reference`, `notes` y `paymentDate` se capturan en estado pero `RegisterDebtPaymentInput` (src/modules/debts/debt-payment-validation.ts) y el modelo `DebtPayment` solo soportan `{debtId, amount}`. No se modificó el schema ni las migraciones; estos campos quedan pendientes de soporte en el API.

## TypeScript
- Estado: LIMPIO (`npx tsc --noEmit` sin errores)
- Adicional: `npm run lint` sin errores, `npm test` — 198 tests pasados, 2 skipped (200 total)

## Estado
■ SECCIÓN CAJA REPARADA — LISTA PARA REVISIÓN DEL INGENIERO LÍDER
