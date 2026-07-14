-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "supplierId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_supplierId_idx" ON "Expense"("supplierId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
