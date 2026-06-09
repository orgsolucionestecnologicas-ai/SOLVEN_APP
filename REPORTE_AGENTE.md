# Reporte de agente — Correcciones post-QA v3

## Corrección 1 — Residuos RD$/ITBIS
- inventory-entry-form.tsx: OK — TAX_OPTIONS reemplazado con alícuotas AFIP [0, 0.105, 0.21, 0.27], default 0.21
- inventory-adjust-form.tsx: OK — label "Impuestos (ITBIS 18%)" → "Impuesto (IVA 21%)", valor 0.18 → 0.21
- customer-payment-form.tsx: OK — prefijo RD$ eliminado del input de monto
- cash-movement-form.tsx: OK — función fmtMoney y hardcode en línea 411 cambiados de RD$ a $

## Corrección 2 — Validación ivaRate con 400
- Cambio implementado en: src/modules/products/product-validation.ts (validateCreateProductInput y validateUpdateProductInput)
- POST /api/products con ivaRate:15 → 400
- Tests agregados: "rejects an invalid ivaRate" y "accepts a valid ivaRate of 0.105" en product-validation.test.ts

## Corrección 3 — SaleItem.ivaRate
- Campo agregado al schema: OK — ivaRate Float @default(0.21) en modelo SaleItem
- Migración ejecutada: OK — 20260608222053_add_sale_item_iva_rate
- ivaRate guardado en creación de venta: OK — buildProductSaleItem retorna ivaRate: product.ivaRate, buildServiceSaleItem retorna ivaRate: 0.21
- Modal de impresión usa saleItem.ivaRate: OK — cartItem.ivaRate refleja el valor correcto al momento de agregar al carrito

## Corrección 4 — requireRole devuelve 403
- ForbiddenError / UnauthorizedError creados: OK — exportados desde src/lib/tenant.ts
- requireRole actualizado: OK — lanza ForbiddenError en lugar de Error("Forbidden")
- requireTenantId actualizado: OK — lanza UnauthorizedError en lugar de Error("Unauthorized")
- Helpers de respuesta en _shared/responses.ts: OK — forbiddenResponse() y unauthorizedResponse() agregados
- Route handlers actualizados: 10 handlers — export, users, users/[id], settings, products, products/[id], inventory-adjustments, expenses + nuevos de corrección 5 (wrapped en try/catch)

## Corrección 5 — requireRole en 10 endpoints
- sales POST: OK — requireRole(["OWNER", "CASHIER"])
- returns POST: OK — requireRole(["OWNER", "CASHIER"])
- debt-payments POST: OK — requireRole(["OWNER", "CASHIER"])
- cash-register POST: OK — requireRole(["OWNER", "CASHIER"])
- cash-register/[id] PATCH: OK — requireRole(["OWNER", "CASHIER"])
- cash-movements POST: OK — requireRole(["OWNER", "CASHIER"])
- customers POST: OK — requireRole(["OWNER", "CASHIER"])
- promotions POST: OK — requireRole(["OWNER"])
- promotions/[id] PATCH/DELETE: OK — requireRole(["OWNER"])
- services/[id] PATCH/DELETE: OK — requireRole(["OWNER", "INVENTORY"])

## Validación
- Prisma validate: PASS
- npm test: PASS — 182 tests en 37 archivos
- TypeScript: PASS
- ESLint: PASS
- Build: PASS

## Commit
`fix: roles en 10 endpoints, 403 correcto, SaleItem.ivaRate, limpieza RD$/ITBIS`
