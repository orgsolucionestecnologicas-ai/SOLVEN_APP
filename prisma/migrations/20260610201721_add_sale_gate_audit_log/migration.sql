-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('TICKET', 'INVOICE');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cae" TEXT,
ADD COLUMN     "caeExpiry" TIMESTAMP(3),
ADD COLUMN     "receiptNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "receiptType" "ReceiptType" NOT NULL DEFAULT 'TICKET',
ADD COLUMN     "sellerCode" TEXT,
ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "arcaEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userCode" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userCode" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_userCode_key" ON "User"("tenantId", "userCode");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

