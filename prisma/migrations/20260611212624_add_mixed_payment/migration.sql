-- AlterEnum
ALTER TYPE "SalePaymentType" ADD VALUE 'MIXED';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cashAmount" DECIMAL(12,2);
