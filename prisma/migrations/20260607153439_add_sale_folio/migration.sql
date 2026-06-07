-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "folio" INTEGER NOT NULL DEFAULT 0;

-- Backfill: numerar las ventas existentes por tenant en orden de creación
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "createdAt") AS rn
  FROM "Sale"
)
UPDATE "Sale" SET "folio" = ranked.rn FROM ranked WHERE "Sale".id = ranked.id;
