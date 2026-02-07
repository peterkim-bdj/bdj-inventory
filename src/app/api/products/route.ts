import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productQuerySchema } from '@/features/products/types';
import { apiError } from '@/lib/api/error';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = productQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { search, storeIds, vendorIds, productTypes, missingSku, missingBarcode, missingPrice, missingImage, sortBy, sortOrder, page, limit } = parsed.data;

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { shopifyBarcode: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (storeIds) {
    where.shopifyStoreId = { in: storeIds.split(',') };
  }

  if (vendorIds) {
    where.vendorId = { in: vendorIds.split(',') };
  }

  if (productTypes) {
    where.productType = { in: productTypes.split(',') };
  }

  // Quick filters (null/non-null checks)
  if (missingSku === 'true') where.sku = null;
  else if (missingSku === 'false') where.sku = { not: null };

  if (missingBarcode === 'true') where.shopifyBarcode = null;
  else if (missingBarcode === 'false') where.shopifyBarcode = { not: null };

  if (missingPrice === 'true') where.price = null;
  else if (missingPrice === 'false') where.price = { not: null };

  if (missingImage === 'true') where.imageUrl = null;
  else if (missingImage === 'false') where.imageUrl = { not: null };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sortBy === 'price'
      ? { price: sortOrder ?? 'asc' }
      : sortBy === 'updatedAt'
        ? { updatedAt: sortOrder ?? 'desc' }
        : sortBy === 'vendorName'
          ? { vendorName: sortOrder ?? 'asc' }
          : { name: sortOrder ?? 'asc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        sku: true,
        shopifyBarcode: true,
        barcodePrefix: true,
        productType: true,
        price: true,
        compareAtPrice: true,
        vendorName: true,
        variantTitle: true,
        variantOptions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        shopifyStore: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Get filter options
  const [stores, vendors, types] = await Promise.all([
    prisma.product.groupBy({
      by: ['shopifyStoreId'],
      where: { isActive: true, shopifyStoreId: { not: null } },
      _count: true,
    }).then(async (groups) => {
      const storeDetails = await prisma.shopifyStore.findMany({
        where: { id: { in: groups.map((g) => g.shopifyStoreId!).filter(Boolean) } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(storeDetails.map((s) => [s.id, s.name]));
      return groups.map((g) => ({
        id: g.shopifyStoreId!,
        name: nameMap.get(g.shopifyStoreId!) ?? g.shopifyStoreId!,
        count: g._count,
      }));
    }),
    prisma.product.groupBy({
      by: ['vendorId'],
      where: { isActive: true, vendorId: { not: null } },
      _count: true,
    }).then(async (groups) => {
      const vendorDetails = await prisma.vendor.findMany({
        where: { id: { in: groups.map((g) => g.vendorId!).filter(Boolean) } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(vendorDetails.map((v) => [v.id, v.name]));
      return groups.map((g) => ({
        id: g.vendorId!,
        name: nameMap.get(g.vendorId!) ?? g.vendorId!,
        count: g._count,
      }));
    }),
    prisma.product.groupBy({
      by: ['productType'],
      where: { isActive: true, productType: { not: null } },
      _count: true,
    }).then((groups) =>
      groups.map((g) => ({
        value: g.productType!,
        count: g._count,
      })),
    ),
  ]);

  return NextResponse.json({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      stores,
      vendors,
      productTypes: types,
    },
  });
}
