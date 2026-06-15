import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const labels = [
  'products',
  'customers',
  'sales',
  'debts',
  'categories',
  'services',
  'expenses',
  'cashMovements',
  'promotions',
  'quotes'
]

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { users: { some: { email: 'demo@solven.app' } } },
    select: { id: true, businessName: true, email: true }
  })

  if (!tenant) {
    throw new Error('Tenant demo no encontrado - aborting')
  }

  const tenantId = tenant.id
  const tenantCount = await prisma.tenant.count()

  console.log(`Reseteando tenant: ${tenant.businessName} (${tenantId})`)

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { tenantId } })
    await tx.promotionUsage.deleteMany({ where: { promotion: { tenantId } } })
    await tx.returnItem.deleteMany({ where: { return: { sale: { tenantId } } } })
    await tx.return.deleteMany({ where: { sale: { tenantId } } })
    await tx.invoice.deleteMany({ where: { tenantId } })
    await tx.quoteItem.deleteMany({ where: { quote: { tenantId } } })
    await tx.quote.deleteMany({ where: { tenantId } })
    await tx.saleItem.deleteMany({ where: { sale: { tenantId } } })
    await tx.sale.deleteMany({ where: { tenantId } })
    await tx.debtPayment.deleteMany({ where: { tenantId } })
    await tx.debt.deleteMany({ where: { tenantId } })
    await tx.cashMovement.deleteMany({ where: { tenantId } })
    await tx.cashRegisterSession.deleteMany({ where: { tenantId } })
    await tx.inventoryMovement.deleteMany({ where: { tenantId } })
    await tx.expense.deleteMany({ where: { tenantId } })
    await tx.service.deleteMany({ where: { tenantId } })
    await tx.promotion.deleteMany({ where: { tenantId } })
    await tx.product.deleteMany({ where: { tenantId } })
    await tx.subcategory.deleteMany({ where: { category: { tenantId } } })
    await tx.category.deleteMany({ where: { tenantId } })
    await tx.customer.deleteMany({ where: { tenantId } })

    if (tenantCount === 1) {
      await tx.codeCounter.deleteMany({})
    }
  }, { maxWait: 20000, timeout: 120000 })

  console.log('Todos los datos de negocio borrados.')

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
    prisma.quote.count({ where: { tenantId } })
  ])

  checks.forEach((count, index) => {
    const status = count === 0 ? 'OK' : 'FAIL'
    console.log(`${status} ${labels[index]}: ${count}`)
  })

  const tenantStill = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { businessName: true, email: true }
  })
  const usersStill = await prisma.user.findMany({
    where: { tenantId },
    select: { email: true },
    orderBy: { email: 'asc' }
  })
  const storeSettingsStill = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: { businessName: true }
  })

  console.log(`Tenant intacto: ${tenantStill?.businessName} (${tenantStill?.email})`)
  console.log(`Usuarios intactos: ${usersStill.map((user) => user.email).join(', ')}`)
  console.log(`StoreSettings intacto: ${storeSettingsStill?.businessName ?? 'no encontrado'}`)

  if (checks.some((count) => count !== 0)) {
    throw new Error('El reset finalizo con conteos pendientes')
  }

  if (!tenantStill || usersStill.length === 0 || !storeSettingsStill) {
    throw new Error('Tenant, User o StoreSettings no quedaron intactos')
  }
}

main()
  .catch((error) => {
    console.error('ERROR:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
