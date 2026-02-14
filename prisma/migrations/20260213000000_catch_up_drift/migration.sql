-- AlterTable (already applied to database)
ALTER TABLE "InventoryItem" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex (already applied to database)
CREATE INDEX "InventoryItem_deletedAt_idx" ON "InventoryItem"("deletedAt");

-- AlterTable (already applied to database)
ALTER TABLE "SyncLog" ADD COLUMN "progress" JSONB;
