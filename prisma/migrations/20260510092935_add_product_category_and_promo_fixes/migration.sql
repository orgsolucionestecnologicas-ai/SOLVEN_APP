-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "categoryName" TEXT NOT NULL DEFAULT 'Otros';

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "minimumPurchaseDiscountType" TEXT DEFAULT 'PERCENTAGE';
