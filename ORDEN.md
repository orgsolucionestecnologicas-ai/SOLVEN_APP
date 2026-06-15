# ORDEN — Reset completo de datos de negocio

> Fecha: 2026-06-15
> Ejecutar con: `node scripts/reset-data.mjs` (crear el script según estas instrucciones)
> Resultado esperado: base de datos limpia — solo Tenant + User demo + StoreSettings

---

## OBJETIVO

Borrar TODOS los datos de negocio del tenant de demo (`demo@solven.app`) de forma segura y en el orden correcto según las foreign keys de Prisma.

**QUÉ BORRAR:** productos, categorías, subcategorías, clientes, ventas, ítems de venta, deudas, pagos, gastos, movimientos de caja, sesiones de caja, inventario, servicios, promociones, cotizaciones, ítems de cotización, facturas, devoluciones, ítems de devolución, audit logs, usage de promociones, code counters.

**QUÉ NO TOCAR:**
- Tabla `Tenant` — conservar el registro del tenant demo
- Tabla `User` — conservar `demo@solven.app` y cualquier otro usuario del tenant
- Tabla `StoreSettings` — conservar la configuración del negocio
- Cualquier registro de otros tenants (si existieran) — el script debe estar SIEMPRE scoped por `tenantId`

---

## PASO 1 — Obtener el tenantId del demo

```js
const tenant = await prisma.tenant.findFirst({
  where: { users: { some: { email: 'demo@solven.app' } } },
  select: { id: true, name: true }
})
if (!tenant) throw new Error('Tenant demo no encontrado')
const tenantId = tenant.id
console.log(`Reseteando tenant: ${tenant.name} (${tenantId})`)
```

---

## PASO 2 — Borrar en orden FK-safe

Ejecutar los deleteMany en ESTE orden exacto. Todos con `where: { tenantId }`.

```js
// 1. AuditLog (no FK hacia otras tablas)
await prisma.auditLog.deleteMany({ where: { tenantId } })

// 2. PromotionUsage
await prisma.promotionUsage.deleteMany({ where: { tenantId } })

// 3. ReturnItem (depende de Return y SaleItem)
await prisma.returnItem.deleteMany({ where: { return: { tenantId } } })

// 4. Return (depende de Sale)
await prisma.return.deleteMany({ where: { tenantId } })

// 5. Invoice (depende de Sale)
await prisma.invoice.deleteMany({ where: { tenantId } })

// 6. QuoteItem (depende de Quote)
await prisma.quoteItem.deleteMany({ where: { quote: { tenantId } } })

// 7. Quote
await prisma.quote.deleteMany({ where: { tenantId } })

// 8. SaleItem (depende de Sale)
await prisma.saleItem.deleteMany({ where: { sale: { tenantId } } })

// 9. Sale
await prisma.sale.deleteMany({ where: { tenantId } })

// 10. DebtPayment (depende de Debt)
await prisma.debtPayment.deleteMany({ where: { debt: { tenantId } } })

// 11. Debt
await prisma.debt.deleteMany({ where: { tenantId } })

// 12. CashMovement
await prisma.cashMovement.deleteMany({ where: { tenantId } })

// 13. CashRegisterSession
await prisma.cashRegisterSession.deleteMany({ where: { tenantId } })

// 14. InventoryMovement
await prisma.inventoryMovement.deleteMany({ where: { tenantId } })

// 15. Expense
await prisma.expense.deleteMany({ where: { tenantId } })

// 16. Service
await prisma.service.deleteMany({ where: { tenantId } })

// 17. Promotion
await prisma.promotion.deleteMany({ where: { tenantId } })

// 18. Product
await prisma.product.deleteMany({ where: { tenantId } })

// 19. Subcategory
await prisma.subcategory.deleteMany({ where: { tenantId } })

// 20. Category
await prisma.category.deleteMany({ where: { tenantId } })

// 21. Customer
await prisma.customer.deleteMany({ where: { tenantId } })

// 22. CodeCounter
await prisma.codeCounter.deleteMany({ where: { tenantId } })
```

---

## PASO 3 — Verificación post-reset

Después de borrar, ejecutar estas queries y confirmar que todos devuelven 0:

```js
const checks = await Promise.all([
  prisma.product.count({ where: { tenantId } }),
  prisma.customer.count({ where: { tenantId } }),
  prisma.sale.count({ where: { tenantId } }),
  prisma.debt.count({ where: { tenantId } }),
  prisma.category.count({ where: { tenantId } }),
  prisma.service.count({ where: { tenantId } }),
  prisma.expense.count({ where: { tenantId } }),
  prisma.cashMovement.count({ where: { tenantId } }),
  prisma.promotion.count({ where: { tenantId } }),
  prisma.quote.count({ where: { tenantId } }),
])
console.log('Conteos post-reset (deben ser todos 0):', checks)
```

Verificar también que Tenant y User siguen intactos:

```js
const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
const users = await prisma.user.findMany({ where: { tenantId } })
console.log('Tenant:', tenant?.name)
console.log('Usuarios:', users.map(u => u.email))
```

---

## PASO 4 — Script completo a crear

Crear el archivo `scripts/reset-data.mjs` con el código completo:

```js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { users: { some: { email: 'demo@solven.app' } } },
    select: { id: true, name: true }
  })
  if (!tenant) throw new Error('Tenant demo no encontrado — aborting')
  const { id: tenantId, name } = tenant
  console.log(`\n🧹 Reseteando datos de: ${name} (${tenantId})\n`)

  await prisma.auditLog.deleteMany({ where: { tenantId } })
  await prisma.promotionUsage.deleteMany({ where: { tenantId } })
  await prisma.returnItem.deleteMany({ where: { return: { tenantId } } })
  await prisma.return.deleteMany({ where: { tenantId } })
  await prisma.invoice.deleteMany({ where: { tenantId } })
  await prisma.quoteItem.deleteMany({ where: { quote: { tenantId } } })
  await prisma.quote.deleteMany({ where: { tenantId } })
  await prisma.saleItem.deleteMany({ where: { sale: { tenantId } } })
  await prisma.sale.deleteMany({ where: { tenantId } })
  await prisma.debtPayment.deleteMany({ where: { debt: { tenantId } } })
  await prisma.debt.deleteMany({ where: { tenantId } })
  await prisma.cashMovement.deleteMany({ where: { tenantId } })
  await prisma.cashRegisterSession.deleteMany({ where: { tenantId } })
  await prisma.inventoryMovement.deleteMany({ where: { tenantId } })
  await prisma.expense.deleteMany({ where: { tenantId } })
  await prisma.service.deleteMany({ where: { tenantId } })
  await prisma.promotion.deleteMany({ where: { tenantId } })
  await prisma.product.deleteMany({ where: { tenantId } })
  await prisma.subcategory.deleteMany({ where: { tenantId } })
  await prisma.category.deleteMany({ where: { tenantId } })
  await prisma.customer.deleteMany({ where: { tenantId } })
  await prisma.codeCounter.deleteMany({ where: { tenantId } })

  console.log('✅ Todos los datos de negocio borrados.')

  const checks = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.sale.count({ where: { tenantId } }),
    prisma.debt.count({ where: { tenantId } }),
    prisma.category.count({ where: { tenantId } }),
    prisma.service.count({ where: { tenantId } }),
    prisma.expense.count({ where: { tenantId } }),
    prisma.cashMovement.count({ where: { tenantId } }),
    prisma.promotion.count({ where: { tenantId } }),
    prisma.quote.count({ where: { tenantId } }),
  ])
  const labels = ['products','customers','sales','debts','categories','services','expenses','cashMovements','promotions','quotes']
  checks.forEach((n, i) => {
    const ok = n === 0 ? '✅' : '❌'
    console.log(`  ${ok} ${labels[i]}: ${n}`)
  })

  const tenantStill = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const usersStill = await prisma.user.findMany({ where: { tenantId }, select: { email: true } })
  console.log(`\n🏠 Tenant intacto: ${tenantStill?.name}`)
  console.log(`👤 Usuarios intactos: ${usersStill.map(u => u.email).join(', ')}`)
}

main()
  .catch(e => { console.error('❌ ERROR:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

---

## PASO 5 — Ejecutar

```bash
node scripts/reset-data.mjs
```

---

## ENTREGABLE

Cuando termine, responder confirmando:
1. Que todos los conteos son 0
2. Que Tenant y User están intactos
3. Si algún `deleteMany` falló: el nombre del modelo y el error exacto

NO ejecutar `prisma migrate reset` ni `DROP TABLE` — solo deleteMany scoped por tenantId.
NO tocar el archivo `.env` ni `.env.production.example`.
