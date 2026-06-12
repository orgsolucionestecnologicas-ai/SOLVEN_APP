-- CreateTable
CREATE TABLE "TenantARCAConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "condicionIVA" TEXT NOT NULL,
    "certEncrypted" TEXT,
    "privateKeyEncrypted" TEXT,
    "ambiente" TEXT NOT NULL DEFAULT 'homo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantARCAConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ARCATokenCache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sign" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ARCATokenCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT,
    "cae" TEXT NOT NULL,
    "caeFchVto" TEXT NOT NULL,
    "voucherNumber" INTEGER NOT NULL,
    "voucherType" INTEGER NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "docTipo" INTEGER NOT NULL,
    "docNro" TEXT NOT NULL,
    "impTotal" DECIMAL(12,2) NOT NULL,
    "impNeto" DECIMAL(12,2) NOT NULL,
    "impIVA" DECIMAL(12,2) NOT NULL,
    "impOpEx" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantARCAConfig_tenantId_key" ON "TenantARCAConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ARCATokenCache_tenantId_key" ON "ARCATokenCache"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_saleId_key" ON "Invoice"("saleId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantARCAConfig" ADD CONSTRAINT "TenantARCAConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARCATokenCache" ADD CONSTRAINT "ARCATokenCache_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
