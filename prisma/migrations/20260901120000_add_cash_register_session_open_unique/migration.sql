-- CreateIndex
CREATE UNIQUE INDEX "CashRegisterSession_tenantId_open_unique" ON "CashRegisterSession"("tenantId") WHERE "status" = 'OPEN';
