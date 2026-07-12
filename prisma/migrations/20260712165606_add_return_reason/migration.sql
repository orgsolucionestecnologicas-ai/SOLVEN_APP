-- CreateEnum
CREATE TYPE "ReturnReasonCategory" AS ENUM ('DEFECTO', 'ERROR_VENTA', 'CAMBIO_OPINION', 'OTRO');

-- AlterTable
ALTER TABLE "Return" ADD COLUMN     "reasonCategory" "ReturnReasonCategory" NOT NULL DEFAULT 'OTRO',
ADD COLUMN     "reasonNote" TEXT;
