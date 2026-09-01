-- CreateTable
CREATE TABLE "ProductLowStockAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lastNotifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLowStockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductLowStockAlert_productId_key" ON "ProductLowStockAlert"("productId");

-- CreateIndex
CREATE INDEX "ProductLowStockAlert_tenantId_idx" ON "ProductLowStockAlert"("tenantId");

-- AddForeignKey
ALTER TABLE "ProductLowStockAlert" ADD CONSTRAINT "ProductLowStockAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
