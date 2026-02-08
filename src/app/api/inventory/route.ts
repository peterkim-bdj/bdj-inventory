import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { inventoryQuerySchema } from '@/features/inventory/types';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = inventoryQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { search, status, locationId, productId, sortBy, sortOrder, page, limit } = parsed.data;

  const where: Prisma.InventoryItemWhereInput = {};

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

  const orderBy: Prisma.InventoryItemOrderByWithRelationInput =
    sortBy === 'barcode' ? { barcode: sortOrder ?? 'asc' }
    : sortBy === 'status' ? { status: sortOrder ?? 'asc' }
    : sortBy === 'productName' ? { product: { name: sortOrder ?? 'asc' } }
    : { receivedAt: sortOrder ?? 'desc' };

  const [items, total] = await Promise.all([
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
            imageUrl: true,
            barcodePrefix: true,
            shopifyBarcode: true,
          },
        },
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  // Aggregate stats
  const stats = await prisma.inventoryItem.groupBy({
    by: ['status'],
    _count: true,
  });

  const locationStats = await prisma.inventoryItem.groupBy({
    by: ['locationId'],
    _count: true,
    where: { locationId: { not: null } },
  });

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
  });
}
