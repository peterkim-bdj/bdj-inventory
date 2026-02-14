import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { inventoryQuerySchema } from '@/features/inventory/types';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = inventoryQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { search, status, locationId, productId, shopifyStoreId, vendorId, trash, sortBy, sortOrder, page, limit } = parsed.data;

  const where: Prisma.InventoryItemWhereInput = {};

  // Soft-delete filter: show only active items by default, trash items when trash=true
  if (trash) {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
  }

  if (search) {
    where.OR = [
      { barcode: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { sku: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status) where.status = status;
  if (locationId) where.locationId = locationId;
  if (productId) where.productId = productId;
  if (shopifyStoreId) where.product = { ...(where.product as object), shopifyStoreId };
  if (vendorId) where.product = { ...(where.product as object), vendorId };

  const orderBy: Prisma.InventoryItemOrderByWithRelationInput =
    sortBy === 'barcode' ? { barcode: sortOrder ?? 'asc' }
    : sortBy === 'status' ? { status: sortOrder ?? 'asc' }
    : sortBy === 'productName' ? { product: { name: sortOrder ?? 'asc' } }
    : { receivedAt: sortOrder ?? 'desc' };

  const [items, total, stats, locationStats, storeFilters, vendorFilters] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            variantTitle: true,
            imageUrl: true,
            barcodePrefix: true,
            shopifyBarcode: true,
            shopifyStoreId: true,
            vendorName: true,
            shopifyStore: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true } },
          },
        },
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.groupBy({
      by: ['status'],
      _count: true,
      where: { deletedAt: null },
    }),
    prisma.inventoryItem.groupBy({
      by: ['locationId'],
      _count: true,
      where: { locationId: { not: null }, deletedAt: null },
    }),
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

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      byStatus: stats.map((s) => ({ status: s.status, count: s._count })),
      byLocation: locationStats,
      total,
    },
    filters: { stores: storeFilters, vendors: vendorFilters },
  });
}
