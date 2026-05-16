import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting data clear...\n");

  // Leaf tables — no children
  const promotionUsages = await prisma.promotionUsage.deleteMany({});
  console.log(`PromotionUsage: ${promotionUsages.count} deleted`);

  const saleItems = await prisma.saleItem.deleteMany({});
  console.log(`SaleItem: ${saleItems.count} deleted`);

  const debtPayments = await prisma.debtPayment.deleteMany({});
  console.log(`DebtPayment: ${debtPayments.count} deleted`);

  const inventoryMovements = await prisma.inventoryMovement.deleteMany({});
  console.log(`InventoryMovement: ${inventoryMovements.count} deleted`);

  const cashMovements = await prisma.cashMovement.deleteMany({});
  console.log(`CashMovement: ${cashMovements.count} deleted`);

  const expenses = await prisma.expense.deleteMany({});
  console.log(`Expense: ${expenses.count} deleted`);

  const cashRegisterSessions = await prisma.cashRegisterSession.deleteMany({});
  console.log(`CashRegisterSession: ${cashRegisterSessions.count} deleted`);

  // Mid-level — FK on Sale.debtId → Debt, so delete Sales first
  const sales = await prisma.sale.deleteMany({});
  console.log(`Sale: ${sales.count} deleted`);

  const debts = await prisma.debt.deleteMany({});
  console.log(`Debt: ${debts.count} deleted`);

  // Parent tables
  const customers = await prisma.customer.deleteMany({});
  console.log(`Customer: ${customers.count} deleted`);

  const products = await prisma.product.deleteMany({});
  console.log(`Product: ${products.count} deleted`);

  const subcategories = await prisma.subcategory.deleteMany({});
  console.log(`Subcategory: ${subcategories.count} deleted`);

  const categories = await prisma.category.deleteMany({});
  console.log(`Category: ${categories.count} deleted`);

  const services = await prisma.service.deleteMany({});
  console.log(`Service: ${services.count} deleted`);

  const promotions = await prisma.promotion.deleteMany({});
  console.log(`Promotion: ${promotions.count} deleted`);

  const codeCounters = await prisma.codeCounter.deleteMany({});
  console.log(`CodeCounter: ${codeCounters.count} deleted`);

  console.log("\nAll data cleared. System is ready for a fresh start.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
