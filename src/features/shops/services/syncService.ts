import { prisma } from '@/lib/prisma';
import { fetchAllProducts, ShopifyApiError } from '@/lib/shopify/client';
import { transformAllProducts } from '@/lib/shopify/transform';
import { generateUniqueBarcodePrefix } from '@/lib/barcode';
import { generateDiff, type DiffItem } from './diff';
import { mapProductToGroup } from './productGroupMapper';
import { Decimal } from 'decimal.js';

export async function startSync(shopId: string) {
  const shop = await prisma.shopifyStore.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      domain: true,
      accessToken: true,
      apiVersion: true,
      syncStatus: true,
    },
  });

  if (!shop) throw new Error('Shop not found');

  if (shop.syncStatus === 'IN_PROGRESS') {
    throw new Error('Sync already in progress');
  }

  // Check if this is initial or re-sync
  const existingProducts = await prisma.product.count({
    where: { shopifyStoreId: shopId, isActive: true },
  });

  const isInitial = existingProducts === 0;

  // Mark as in progress
  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: { syncStatus: 'IN_PROGRESS' },
  });

  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: {
      shopifyStoreId: shopId,
      syncType: isInitial ? 'INITIAL' : 'RESYNC',
      status: 'FETCHING',
    },
  });

  try {
    // Fetch from Shopify
    const shopifyProducts = await fetchAllProducts({
      domain: shop.domain,
      accessToken: shop.accessToken,
      apiVersion: shop.apiVersion,
    });

    const transformed = transformAllProducts(shopifyProducts, shopId);

    if (isInitial) {
      return await performInitialSync(shopId, syncLog.id, transformed);
    } else {
      return await performResync(shopId, syncLog.id, transformed);
    }
  } catch (error) {
    // Mark as failed
    const errorMessage =
      error instanceof ShopifyApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error';

    const errorCode =
      error instanceof ShopifyApiError ? error.code : 'SYNC_ERROR';

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: 'FAILED', error: errorMessage, completedAt: new Date() },
    });

    await prisma.shopifyStore.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });

    throw new ShopifyApiError(
      errorMessage,
      error instanceof ShopifyApiError ? error.statusCode : 500,
      errorCode,
    );
  }
}

async function performInitialSync(
  shopId: string,
  syncLogId: string,
  products: ReturnType<typeof transformAllProducts>,
) {
  // Collect unique vendor names
  const vendorNames = [...new Set(products.map((p) => p.vendorName).filter(Boolean))] as string[];

  // Upsert vendors
  const vendorMap = new Map<string, string>();
  for (const name of vendorNames) {
    const vendor = await prisma.vendor.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true, name: true },
    });
    vendorMap.set(name, vendor.id);
  }

  // Create products
  const createdIds: string[] = [];
  for (const p of products) {
    const barcodePrefix = await generateUniqueBarcodePrefix();
    const vendorId = p.vendorName ? vendorMap.get(p.vendorName) ?? null : null;

    const created = await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        sku: p.sku,
        shopifyBarcode: p.shopifyBarcode,
        barcodePrefix,
        productType: p.productType,
        price: p.price ? new Decimal(p.price) : null,
        compareAtPrice: p.compareAtPrice ? new Decimal(p.compareAtPrice) : null,
        vendorId,
        vendorName: p.vendorName,
        shopifyProductId: p.shopifyProductId,
        shopifyVariantId: p.shopifyVariantId,
        shopifyStoreId: shopId,
      },
    });
    createdIds.push(created.id);
  }

  // ProductGroup auto-mapping
  for (const id of createdIds) {
    await mapProductToGroup(id);
  }

  // Update sync log
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'COMPLETED',
      totalFetched: products.length,
      newCount: products.length,
      completedAt: new Date(),
    },
  });

  // Update store
  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: {
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
      productCount: products.length,
    },
  });

  return {
    syncLogId,
    syncType: 'INITIAL' as const,
    status: 'COMPLETED' as const,
    summary: {
      totalFetched: products.length,
      newCount: products.length,
      vendorsCreated: vendorNames.length,
    },
  };
}

async function performResync(
  shopId: string,
  syncLogId: string,
  shopifyProducts: ReturnType<typeof transformAllProducts>,
) {
  // Get existing products from DB
  const dbProducts = await prisma.product.findMany({
    where: { shopifyStoreId: shopId, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      shopifyBarcode: true,
      productType: true,
      price: true,
      compareAtPrice: true,
      imageUrl: true,
      vendorName: true,
      shopifyProductId: true,
      shopifyVariantId: true,
    },
  });

  // Convert Decimal fields to strings for comparison
  const dbProductsForDiff = dbProducts.map((p) => ({
    ...p,
    price: p.price?.toString() ?? null,
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
  }));

  const { items, summary } = generateDiff(shopifyProducts, dbProductsForDiff);

  // Save diff data
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'DIFF_REVIEW',
      totalFetched: summary.totalFetched,
      newCount: summary.newCount,
      modifiedCount: summary.modifiedCount,
      removedCount: summary.removedCount,
      unchangedCount: summary.unchangedCount,
      diffData: JSON.parse(JSON.stringify(items)),
    },
  });

  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: { syncStatus: 'DIFF_REVIEW' },
  });

  return {
    syncLogId,
    syncType: 'RESYNC' as const,
    status: 'DIFF_REVIEW' as const,
    summary,
  };
}

export async function getDiff(shopId: string) {
  const shop = await prisma.shopifyStore.findUnique({
    where: { id: shopId },
    select: { name: true },
  });

  const syncLog = await prisma.syncLog.findFirst({
    where: { shopifyStoreId: shopId, status: 'DIFF_REVIEW' },
    orderBy: { createdAt: 'desc' },
  });

  if (!syncLog || !shop) return null;

  return {
    syncLogId: syncLog.id,
    shopName: shop.name,
    summary: {
      new: syncLog.newCount,
      modified: syncLog.modifiedCount,
      removed: syncLog.removedCount,
      unchanged: syncLog.unchangedCount,
    },
    items: syncLog.diffData as unknown as DiffItem[],
  };
}

export async function applyDiff(
  shopId: string,
  syncLogId: string,
  actions: Array<{ diffId: string; action: 'add' | 'update' | 'keep' | 'deactivate' }>,
) {
  const syncLog = await prisma.syncLog.findUnique({
    where: { id: syncLogId },
  });

  if (!syncLog || syncLog.status !== 'DIFF_REVIEW') {
    throw new Error('No diff review in progress');
  }

  const diffItems = syncLog.diffData as unknown as DiffItem[];
  const diffMap = new Map(diffItems.map((item) => [item.id, item]));
  const actionMap = new Map(actions.map((a) => [a.diffId, a.action]));

  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: { status: 'APPLYING' },
  });

  let appliedCount = 0;
  let skippedCount = 0;

  // Collect vendor names for upserting
  const vendorNames = new Set<string>();
  for (const [diffId, action] of actionMap) {
    if (action === 'keep') {
      skippedCount++;
      continue;
    }

    const item = diffMap.get(diffId);
    if (!item) continue;

    if (item.type === 'NEW' && action === 'add' && item.data) {
      const vendorName = item.data.vendorName as string | null;
      if (vendorName) vendorNames.add(vendorName);
    }
  }

  // Upsert vendors
  const vendorIdMap = new Map<string, string>();
  for (const name of vendorNames) {
    const vendor = await prisma.vendor.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    });
    vendorIdMap.set(name, vendor.id);
  }

  // Apply actions
  const newProductIds: string[] = [];

  for (const [diffId, action] of actionMap) {
    if (action === 'keep') continue;

    const item = diffMap.get(diffId);
    if (!item) continue;

    if (item.type === 'NEW' && action === 'add' && item.data) {
      const data = item.data;
      const barcodePrefix = await generateUniqueBarcodePrefix();
      const vendorName = data.vendorName as string | null;
      const vendorId = vendorName ? vendorIdMap.get(vendorName) ?? null : null;

      const created = await prisma.product.create({
        data: {
          name: data.name as string,
          description: (data.description as string) ?? null,
          imageUrl: (data.imageUrl as string) ?? null,
          sku: (data.sku as string) ?? null,
          shopifyBarcode: (data.shopifyBarcode as string) ?? null,
          barcodePrefix,
          productType: (data.productType as string) ?? null,
          price: data.price ? new Decimal(data.price as string) : null,
          compareAtPrice: data.compareAtPrice
            ? new Decimal(data.compareAtPrice as string)
            : null,
          vendorId,
          vendorName,
          shopifyProductId: item.shopifyProductId!,
          shopifyVariantId: item.shopifyVariantId!,
          shopifyStoreId: shopId,
        },
      });
      newProductIds.push(created.id);
      appliedCount++;
    } else if (item.type === 'MODIFIED' && action === 'update' && item.changes) {
      const updateData: Record<string, unknown> = {};
      for (const change of item.changes) {
        if (change.field === 'price' || change.field === 'compareAtPrice') {
          updateData[change.field] = change.new
            ? new Decimal(String(change.new))
            : null;
        } else {
          updateData[change.field] = change.new;
        }
      }

      await prisma.product.update({
        where: { id: item.productId! },
        data: updateData,
      });
      appliedCount++;
    } else if (item.type === 'REMOVED' && action === 'deactivate') {
      await prisma.product.update({
        where: { id: item.productId! },
        data: { isActive: false },
      });
      appliedCount++;
    } else {
      skippedCount++;
    }
  }

  // ProductGroup auto-mapping for new products
  for (const id of newProductIds) {
    await mapProductToGroup(id);
  }

  // Update sync log
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'COMPLETED',
      appliedCount,
      completedAt: new Date(),
    },
  });

  // Update store
  const productCount = await prisma.product.count({
    where: { shopifyStoreId: shopId, isActive: true },
  });

  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: {
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
      productCount,
    },
  });

  return {
    applied: appliedCount,
    skipped: skippedCount,
    syncStatus: 'COMPLETED',
  };
}

export async function getSyncLogs(shopId: string) {
  return prisma.syncLog.findMany({
    where: { shopifyStoreId: shopId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      syncType: true,
      status: true,
      totalFetched: true,
      newCount: true,
      modifiedCount: true,
      removedCount: true,
      unchangedCount: true,
      appliedCount: true,
      error: true,
      startedAt: true,
      completedAt: true,
    },
    take: 20,
  });
}

export async function syncAllShops() {
  const shops = await prisma.shopifyStore.findMany({
    where: { isActive: true, syncStatus: { not: 'IN_PROGRESS' } },
    select: { id: true, name: true },
  });

  const results = [];
  for (const shop of shops) {
    try {
      const result = await startSync(shop.id);
      results.push({ shopId: shop.id, shopName: shop.name, ...result });
    } catch (error) {
      results.push({
        shopId: shop.id,
        shopName: shop.name,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
