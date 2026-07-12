-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "writeOffAt" TIMESTAMP(3),
ADD COLUMN     "writeOffNote" TEXT,
ADD COLUMN     "writtenOff" BOOLEAN NOT NULL DEFAULT false;
