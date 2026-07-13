-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "businessType" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "preferredPaymentMethod" TEXT NOT NULL DEFAULT 'efectivo';
