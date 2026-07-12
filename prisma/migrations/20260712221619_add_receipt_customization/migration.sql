-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "logoUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "receiptFooterMessage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "receiptThankYouMessage" TEXT NOT NULL DEFAULT '¡Gracias por su compra!';
