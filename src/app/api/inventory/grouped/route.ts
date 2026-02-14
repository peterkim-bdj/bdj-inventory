import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { groupedInventoryQuerySchema } from '@/features/inventory/types';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = groupedInventoryQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { search, status, locationId, shopifyStoreId, vendorId, sortBy, sortOrder, page, limit } = parsed.data;

  // Build where clause for InventoryItem
  const where: Prisma.InventoryItemWhereInput = {
    deletedAt: null, // Only show non-deleted items in grouped view
  };

  if (search) {
    where.OR = [
      { barcode: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { sku: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status) where.status = status;
  if (locationId) where.locationId = locationId;
  if (shopifyStoreId) where.product = { ...(where.product as object), shopifyStoreId };
  if (vendorId) where.product = { ...(where.product as object), vendorId };

  // Step 1: Get grouped counts by productId
  const grouped = await prisma.inventoryItem.groupBy({
    by: ['productId'],
    where,
    _count: true,
  });

  const totalGroups = grouped.length;

  // Sort groups
  const sortedGroups = [...grouped];
  if (sortBy === 'totalCount') {
    sortedGroups.sort((a, b) =>
      sortOrder === 'asc' ? a._count - b._count : b._count - a._count
    );
  }
  // For productName sort, we'll sort after product fetch

  // Paginate
  const paginatedGroups = sortBy === 'productName'
    ? sortedGroups // sort later after product fetch
    : sortedGroups.slice((page - 1) * limit, page * limit);

  const productIds = (sortBy === 'productName' ? sortedGroups : paginatedGroups).map((g) => g.productId);

  // Steps 2-5: Run in parallel (all depend only on phase 1 productIds)
  const [products, statusCounts, stats, storeFilters, vendorFilters] = await Promise.all([
    // Step 2: Get product info
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        variantTitle: true,
        sku: true,
        imageUrl: true,
        shopifyStoreId: true,
        vendorName: true,
      },
    }),
    // Step 3: Get status counts per product
    prisma.inventoryItem.groupBy({
      by: ['productId', 'status'],
      where: { productId: { in: productIds }, ...where },
      _count: true,
    }),
    // Stats
    prisma.inventoryItem.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    // Filter metadata
    prisma.$queryRaw<Array<{ id: string; name: string; count: number }>>`
      SELECT s.id, s.name, COUNT(i.id)::int as count
      FROM "InventoryItem" i
      JOIN "Product" p ON i."productId" = p.id
      JOIN "ShopifyStore" s ON p."shopifyStoreId" = s.id
      WHERE i."deletedAt" IS NULL
      GROUP BY s.id, s.name ORDER BY s.name
    `,
    prisma.$queryRaw<Array<{ id: string; name: string; count: number }>>`
      SELECT v.id, v.name, COUNT(i.id)::int as count
      FROM "InventoryItem" i
      JOIN "Product" p ON i."productId" = p.id
      JOIN "Vendor" v ON p."vendorId" = v.id
      WHERE i."deletedAt" IS NULL
      GROUP BY v.id, v.name ORDER BY v.name
    `,
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));

  const statusMap = new Map<string, Record<string, number>>();
  for (const sc of statusCounts) {
    const existing = statusMap.get(sc.productId) ?? {};
    existing[sc.status] = sc._count;
    statusMap.set(sc.productId, existing);
  }

  // Build groups with product info
  let groups = (sortBy === 'productName' ? sortedGroups : paginatedGroups).map((g) => ({
    product: productMap.get(g.productId) ?? {
      id: g.productId,
      name: 'Unknown',
      variantTitle: null,
      sku: null,
      imageUrl: null,
      shopifyStoreId: null,
      vendorName: null,
    },
    totalCount: g._count,
    statusCounts: statusMap.get(g.productId) ?? {},
  }));

  // Sort by productName if needed, then paginate
  if (sortBy === 'productName') {
    groups.sort((a, b) => {
      const nameA = `${a.product.name}${a.product.variantTitle ?? ''}`.toLowerCase();
      const nameB = `${b.product.name}${b.product.variantTitle ?? ''}`.toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    groups = groups.slice((page - 1) * limit, page * limit);
  }

  const totalItems = stats.reduce((sum, s) => sum + s._count, 0);

  return NextResponse.json({
    groups,
    pagination: {
      page,
      limit,
      total: totalGroups,
      totalPages: Math.ceil(totalGroups / limit),
      totalItems,
    },
    stats: {
      byStatus: stats.map((s) => ({ status: s.status, count: s._count })),
      total: totalItems,
    },
    filters: { stores: storeFilters, vendors: vendorFilters },
  });
}
