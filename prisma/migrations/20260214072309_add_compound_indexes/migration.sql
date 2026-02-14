-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "InventoryItem_deletedAt_status_idx" ON "InventoryItem"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "InventoryItem_deletedAt_productId_idx" ON "InventoryItem"("deletedAt", "productId");

-- CreateIndex
CREATE INDEX "Product_shopifyStoreId_isActive_idx" ON "Product"("shopifyStoreId", "isActive");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
