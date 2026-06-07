-- CreateTable
CREATE TABLE "HelpQuery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpQuery_tenantId_idx" ON "HelpQuery"("tenantId");

-- CreateIndex
CREATE INDEX "HelpQuery_createdAt_idx" ON "HelpQuery"("createdAt");

-- AddForeignKey
ALTER TABLE "HelpQuery" ADD CONSTRAINT "HelpQuery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
