-- CreateEnum
CREATE TYPE "ShopSyncStatus" AS ENUM ('NEVER', 'SYNCED', 'IN_PROGRESS', 'DIFF_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('INITIAL', 'RESYNC');

-- CreateEnum
CREATE TYPE "SyncLogStatus" AS ENUM ('FETCHING', 'DIFF_REVIEW', 'APPLYING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ShopifyStore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL DEFAULT '2025-01',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "ShopSyncStatus" NOT NULL DEFAULT 'NEVER',
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "shopifyStoreId" TEXT NOT NULL,
    "syncType" "SyncType" NOT NULL,
    "status" "SyncLogStatus" NOT NULL DEFAULT 'FETCHING',
    "totalFetched" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "modifiedCount" INTEGER NOT NULL DEFAULT 0,
    "removedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "diffData" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "autoNotify" BOOLEAN NOT NULL DEFAULT false,
    "minLeadDays" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductGroup" (
    "id" TEXT NOT NULL,
    "canonicalSku" TEXT,
    "canonicalBarcode" TEXT,
    "name" TEXT NOT NULL,
    "productType" TEXT,
    "vendorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sku" TEXT,
    "shopifyBarcode" TEXT,
    "barcodePrefix" TEXT NOT NULL,
    "productType" TEXT,
    "price" DECIMAL(65,30),
    "compareAtPrice" DECIMAL(65,30),
    "vendorId" TEXT,
    "vendorName" TEXT,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "shopifyStoreId" TEXT,
    "shopifySynced" BOOLEAN NOT NULL DEFAULT true,
    "productGroupId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStore_domain_key" ON "ShopifyStore"("domain");

-- CreateIndex
CREATE INDEX "SyncLog_shopifyStoreId_idx" ON "SyncLog"("shopifyStoreId");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "SyncLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_canonicalSku_key" ON "ProductGroup"("canonicalSku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_canonicalBarcode_key" ON "ProductGroup"("canonicalBarcode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcodePrefix_key" ON "Product"("barcodePrefix");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_shopifyBarcode_idx" ON "Product"("shopifyBarcode");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE INDEX "Product_shopifyStoreId_idx" ON "Product"("shopifyStoreId");

-- CreateIndex
CREATE INDEX "Product_productGroupId_idx" ON "Product"("productGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopifyStoreId_shopifyProductId_shopifyVariantId_key" ON "Product"("shopifyStoreId", "shopifyProductId", "shopifyVariantId");

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "ShopifyStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "ShopifyStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
