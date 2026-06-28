-- CreateEnum
CREATE TYPE "SalePaymentType" AS ENUM ('CASH', 'CREDIT');

-- AlterTable
ALTER TABLE "Sale"
ADD COLUMN "paymentType" "SalePaymentType" NOT NULL DEFAULT 'CASH',
ADD COLUMN "customerId" TEXT,
ADD COLUMN "debtId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_debtId_key" ON "Sale"("debtId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- AddForeignKey
ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_debtId_fkey"
FOREIGN KEY ("debtId") REFERENCES "Debt"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
