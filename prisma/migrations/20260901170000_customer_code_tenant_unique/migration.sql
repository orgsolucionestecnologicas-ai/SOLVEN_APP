-- DropIndex
DROP INDEX "Customer_customerCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_customerCode_key" ON "Customer"("tenantId", "customerCode");
