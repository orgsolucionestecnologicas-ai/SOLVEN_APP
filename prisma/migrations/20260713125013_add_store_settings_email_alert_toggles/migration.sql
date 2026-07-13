-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "cashDifferenceEmailAlerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lowStockEmailAlerts" BOOLEAN NOT NULL DEFAULT false;
