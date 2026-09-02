-- CreateTable
CREATE TABLE "ProductSkuCounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryPrefix" TEXT NOT NULL,
    "lastVal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSkuCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSkuCounter_tenantId_categoryPrefix_key" ON "ProductSkuCounter"("tenantId", "categoryPrefix");

-- AddForeignKey
ALTER TABLE "ProductSkuCounter" ADD CONSTRAINT "ProductSkuCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
