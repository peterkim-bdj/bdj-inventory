import { prisma } from '@/lib/prisma';
import { fetchAllProducts, ShopifyApiError } from '@/lib/shopify/client';
import { transformAllProducts } from '@/lib/shopify/transform';
import { generateUniqueBarcodePrefix } from '@/lib/barcode';
import { generateDiff, type DiffItem } from './diff';
import { mapProductToGroup } from './productGroupMapper';
import { Decimal } from 'decimal.js';
import { getShopCredentials } from './shopService';

export class ShopNotFoundError extends Error {
  constructor() {
    super('Shop not found');
    this.name = 'ShopNotFoundError';
  }
}

export class SyncInProgressError extends Error {
  constructor() {
    super('Sync already in progress');
    this.name = 'SyncInProgressError';
  }
}

// --- Progress types ---

interface SyncProgressLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface SyncProgress {
  phase: 'fetching' | 'processing' | 'completing' | 'complete' | 'error';
  fetchedCount?: number;
  currentPage?: number;
  processedCount?: number;
  totalCount?: number;
  currentProduct?: { name: string; sku?: string };
  logs?: SyncProgressLog[];
  error?: string;
  summary?: {
    totalFetched: number;
    newCount: number;
    vendorsCreated?: number;
  };
}

const MAX_LOGS = 100;

function addLog(logs: SyncProgressLog[], message: string, type: SyncProgressLog['type'] = 'info'): SyncProgressLog[] {
  const entry: SyncProgressLog = {
    timestamp: new Date().toISOString(),
    message,
    type,
  };
  const updated = [...logs, entry];
  return updated.length > MAX_LOGS ? updated.slice(-MAX_LOGS) : updated;
}

async function updateProgress(syncLogId: string, progress: SyncProgress) {
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: { progress: progress as object },
  });
}

// --- Async sync (fire-and-forget) ---

export async function startSyncAsync(shopId: string): Promise<{ syncLogId: string; status: 'IN_PROGRESS' }> {
  const shop = await getShopCredentials(shopId);
  if (!shop) throw new ShopNotFoundError();

  const syncStatus = (await prisma.shopifyStore.findUnique({
    where: { id: shopId },
    select: { syncStatus: true },
  }))?.syncStatus;

  if (syncStatus === 'IN_PROGRESS') {
    throw new SyncInProgressError();
  }

  const existingProducts = await prisma.product.count({
    where: { shopifyStoreId: shopId, isActive: true },
  });

  const isInitial = existingProducts === 0;

  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: { syncStatus: 'IN_PROGRESS' },
  });

  const syncLog = await prisma.syncLog.create({
    data: {
      shopifyStoreId: shopId,
      syncType: isInitial ? 'INITIAL' : 'RESYNC',
      status: 'FETCHING',
      progress: {
        phase: 'fetching',
        fetchedCount: 0,
        currentPage: 0,
        logs: [{ timestamp: new Date().toISOString(), message: 'Sync started', type: 'info' }],
      } as object,
    },
  });

  // Fire-and-forget
  syncWithProgress(shopId, syncLog.id, shop, isInitial).catch(async (error) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const logs: SyncProgressLog[] = [{ timestamp: new Date().toISOString(), message: `Sync failed: ${errorMessage}`, type: 'error' }];
    await updateProgress(syncLog.id, { phase: 'error', error: errorMessage, logs });
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: 'FAILED', error: errorMessage, completedAt: new Date() },
    });
    await prisma.shopifyStore.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });
  });

  return { syncLogId: syncLog.id, status: 'IN_PROGRESS' };
}

async function syncWithProgress(
  shopId: string,
  syncLogId: string,
  shop: { domain: string; accessToken: string; apiVersion: string },
  isInitial: boolean,
) {
  let logs: SyncProgressLog[] = [{ timestamp: new Date().toISOString(), message: 'Sync started', type: 'info' }];

  // Phase 1: Fetching
  const shopifyProducts = await fetchAllProducts(
    { domain: shop.domain, accessToken: shop.accessToken, apiVersion: shop.apiVersion },
    async ({ page, count }) => {
      logs = addLog(logs, `Fetching page ${page}... (${count} products)`);
      await updateProgress(syncLogId, {
        phase: 'fetching',
        fetchedCount: count,
        currentPage: page,
        logs,
      });
    },
  );

  const transformed = transformAllProducts(shopifyProducts, shopId);
  logs = addLog(logs, `Fetch complete. ${transformed.length} products found`, 'success');

  if (isInitial) {
    await performInitialSyncWithProgress(shopId, syncLogId, transformed, logs);
  } else {
    await performResyncWithProgress(shopId, syncLogId, transformed, logs);
  }
}

async function performInitialSyncWithProgress(
  shopId: string,
  syncLogId: string,
  products: ReturnType<typeof transformAllProducts>,
  logs: SyncProgressLog[],
) {
  const total = products.length;
  logs = addLog(logs, `Processing ${total} products...`);
  await updateProgress(syncLogId, {
    phase: 'processing',
    processedCount: 0,
    totalCount: total,
    logs,
  });

  // Upsert vendors
  const vendorNames = [...new Set(products.map((p) => p.vendorName).filter(Boolean))] as string[];
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

  // Create products with progress
  const createdIds: string[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
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
        variantTitle: p.variantTitle,
        variantOptions: p.variantOptions ?? undefined,
        shopifyProductId: p.shopifyProductId,
        shopifyVariantId: p.shopifyVariantId,
        shopifyStoreId: shopId,
      },
    });
    createdIds.push(created.id);

    // Update progress every 5 products or on last
    if ((i + 1) % 5 === 0 || i === products.length - 1) {
      logs = addLog(logs, `"${p.name}"${p.sku ? ` (${p.sku})` : ''}`, 'success');
      await updateProgress(syncLogId, {
        phase: 'processing',
        processedCount: i + 1,
        totalCount: total,
        currentProduct: { name: p.name, sku: p.sku ?? undefined },
        logs,
      });
    }
  }

  // ProductGroup auto-mapping
  logs = addLog(logs, 'Mapping product groups...');
  await updateProgress(syncLogId, { phase: 'completing', logs });

  for (const id of createdIds) {
    await mapProductToGroup(id);
  }

  // Complete
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'COMPLETED',
      totalFetched: products.length,
      newCount: products.length,
      completedAt: new Date(),
    },
  });

  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: {
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
      productCount: products.length,
    },
  });

  logs = addLog(logs, `Sync completed. ${products.length} products synced.`, 'success');
  await updateProgress(syncLogId, {
    phase: 'complete',
    processedCount: total,
    totalCount: total,
    summary: {
      totalFetched: products.length,
      newCount: products.length,
      vendorsCreated: vendorNames.length,
    },
    logs,
  });
}

async function performResyncWithProgress(
  shopId: string,
  syncLogId: string,
  shopifyProducts: ReturnType<typeof transformAllProducts>,
  logs: SyncProgressLog[],
) {
  logs = addLog(logs, 'Comparing with existing products...');
  await updateProgress(syncLogId, { phase: 'processing', logs });

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
      variantTitle: true,
      shopifyProductId: true,
      shopifyVariantId: true,
    },
  });

  const dbProductsForDiff = dbProducts.map((p) => ({
    ...p,
    price: p.price?.toString() ?? null,
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
  }));

  const { items, summary } = generateDiff(shopifyProducts, dbProductsForDiff);

  logs = addLog(logs, `Diff complete: ${summary.newCount} new, ${summary.modifiedCount} modified, ${summary.removedCount} removed`, 'success');

  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'DIFF_REVIEW',
      totalFetched: summary.totalFetched,
      newCount: summary.newCount,
      modifiedCount: summary.modifiedCount,
      removedCount: summary.removedCount,
      unchangedCount: summary.unchangedCount,
      diffData: structuredClone(items) as object[],
    },
  });

  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: { syncStatus: 'DIFF_REVIEW' },
  });

  await updateProgress(syncLogId, {
    phase: 'complete',
    processedCount: summary.totalFetched,
    totalCount: summary.totalFetched,
    summary: {
      totalFetched: summary.totalFetched,
      newCount: summary.newCount,
    },
    logs,
  });
}

// --- Legacy startSync (kept for backward compatibility with sync-all) ---

export async function startSync(shopId: string) {
  const shop = await getShopCredentials(shopId);
  if (!shop) throw new ShopNotFoundError();

  const syncStatus = (await prisma.shopifyStore.findUnique({
    where: { id: shopId },
    select: { syncStatus: true },
  }))?.syncStatus;

  if (syncStatus === 'IN_PROGRESS') {
    throw new SyncInProgressError();
  }

  const existingProducts = await prisma.product.count({
    where: { shopifyStoreId: shopId, isActive: true },
  });

  const isInitial = existingProducts === 0;

  await prisma.shopifyStore.update({
    where: { id: shopId },
    data: { syncStatus: 'IN_PROGRESS' },
  });

  const syncLog = await prisma.syncLog.create({
    data: {
      shopifyStoreId: shopId,
      syncType: isInitial ? 'INITIAL' : 'RESYNC',
      status: 'FETCHING',
    },
  });

  try {
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
  const vendorNames = [...new Set(products.map((p) => p.vendorName).filter(Boolean))] as string[];

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
        variantTitle: p.variantTitle,
        variantOptions: p.variantOptions ?? undefined,
        shopifyProductId: p.shopifyProductId,
        shopifyVariantId: p.shopifyVariantId,
        shopifyStoreId: shopId,
      },
    });
    createdIds.push(created.id);
  }

  for (const id of createdIds) {
    await mapProductToGroup(id);
  }

  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'COMPLETED',
      totalFetched: products.length,
      newCount: products.length,
      completedAt: new Date(),
    },
  });

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
      variantTitle: true,
      shopifyProductId: true,
      shopifyVariantId: true,
    },
  });

  const dbProductsForDiff = dbProducts.map((p) => ({
    ...p,
    price: p.price?.toString() ?? null,
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
  }));

  const { items, summary } = generateDiff(shopifyProducts, dbProductsForDiff);

  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'DIFF_REVIEW',
      totalFetched: summary.totalFetched,
      newCount: summary.newCount,
      modifiedCount: summary.modifiedCount,
      removedCount: summary.removedCount,
      unchangedCount: summary.unchangedCount,
      diffData: structuredClone(items) as object[],
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
          variantTitle: (data.variantTitle as string) ?? null,
          variantOptions: data.variantOptions ?? undefined,
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

  for (const id of newProductIds) {
    await mapProductToGroup(id);
  }

  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: 'COMPLETED',
      appliedCount,
      completedAt: new Date(),
    },
  });

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

export async function getSyncProgress(syncLogId: string) {
  const syncLog = await prisma.syncLog.findUnique({
    where: { id: syncLogId },
    select: { progress: true, status: true },
  });
  if (!syncLog) return null;
  return syncLog.progress as SyncProgress | null;
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
