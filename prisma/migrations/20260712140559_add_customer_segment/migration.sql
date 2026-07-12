-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('NINGUNO', 'NUEVO', 'RECURRENTE', 'VIP');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "segment" "CustomerSegment" NOT NULL DEFAULT 'NINGUNO';

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "customerSegment" "CustomerSegment";
