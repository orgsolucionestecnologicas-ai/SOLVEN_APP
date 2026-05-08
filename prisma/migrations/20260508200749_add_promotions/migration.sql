-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'TWO_FOR_ONE', 'THREE_FOR_TWO', 'MINIMUM_PURCHASE', 'SPECIAL_PRICE', 'BUNDLED_PRODUCTS');

-- CreateEnum
CREATE TYPE "PromotionApplication" AS ENUM ('ALL_PRODUCTS', 'CATEGORY', 'SPECIFIC_PRODUCT', 'BUNDLED');

-- CreateEnum
CREATE TYPE "PromotionActivation" AS ENUM ('AUTOMATIC', 'MANUAL_CODE', 'BOTH');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "PromotionType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "application" "PromotionApplication" NOT NULL,
    "categoryName" TEXT,
    "productAId" TEXT,
    "productBId" TEXT,
    "productBDiscount" DECIMAL(10,2),
    "minimumAmount" DECIMAL(10,2),
    "fixedPrice" DECIMAL(10,2),
    "activationType" "PromotionActivation" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "daysOfWeek" TEXT,
    "maxUsages" INTEGER,
    "maxUsagesPerCustomer" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionUsage" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "saleId" TEXT,
    "customerId" TEXT,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "PromotionUsage_promotionId_idx" ON "PromotionUsage"("promotionId");

-- CreateIndex
CREATE INDEX "PromotionUsage_saleId_idx" ON "PromotionUsage"("saleId");

-- AddForeignKey
ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
