/*
  Warnings:

  - You are about to drop the `HelpQuery` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "HelpQuery" DROP CONSTRAINT "HelpQuery_tenantId_fkey";

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "paymentDetails" JSONB;

-- DropTable
DROP TABLE "HelpQuery";
