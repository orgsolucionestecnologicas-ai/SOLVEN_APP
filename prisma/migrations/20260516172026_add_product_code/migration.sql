-- AlterTable
ALTER TABLE "Product" ADD COLUMN "productCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");
