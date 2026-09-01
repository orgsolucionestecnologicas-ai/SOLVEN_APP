-- DropIndex
DROP INDEX "Product_productCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_productCode_key" ON "Product"("tenantId", "productCode");
