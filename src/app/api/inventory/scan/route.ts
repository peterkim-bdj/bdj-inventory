import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { scanQuerySchema } from '@/features/inventory/types';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = scanQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'barcode or candidates is required', 400);
  }

  const { barcode, candidates } = parsed.data;
  const selectFields = {
    id: true,
    name: true,
    sku: true,
    variantTitle: true,
    shopifyBarcode: true,
    barcodePrefix: true,
    imageUrl: true,
    price: true,
    vendorName: true,
    _count: { select: { inventoryItems: true } },
  };

  // --- Candidates mode (OCR SKU batch match) ---
  if (candidates) {
    const skuList = candidates.split(',').map(s => s.trim()).filter(Boolean);

    const bySkus = await prisma.product.findMany({
      where: {
        sku: { in: skuList, mode: 'insensitive' },
        isActive: true,
      },
      select: selectFields,
    });

    if (bySkus.length > 0) {
      return NextResponse.json({ type: 'sku', products: bySkus });
    }

    // Fallback: name contains search for each candidate
    const byNames = await prisma.product.findMany({
      where: {
        OR: skuList.map(s => ({
          name: { contains: s, mode: 'insensitive' as const },
        })),
        isActive: true,
      },
      select: selectFields,
      take: 10,
    });

    return NextResponse.json({
      type: byNames.length > 0 ? 'name' : 'exact',
      products: byNames,
    });
  }

  // --- Barcode mode (existing flow) ---
  // Priority 1: Exact shopifyBarcode match
  const byBarcode = await prisma.product.findMany({
    where: { shopifyBarcode: barcode, isActive: true },
    select: selectFields,
  });

  if (byBarcode.length > 0) {
    return NextResponse.json({ type: 'exact', products: byBarcode });
  }

  // Priority 2: Exact SKU match
  const bySku = await prisma.product.findMany({
    where: { sku: barcode, isActive: true },
    select: selectFields,
  });

  if (bySku.length > 0) {
    return NextResponse.json({ type: 'sku', products: bySku });
  }

  // Priority 3: Name contains (partial match)
  const byName = await prisma.product.findMany({
    where: { name: { contains: barcode, mode: 'insensitive' }, isActive: true },
    select: selectFields,
    take: 10,
  });

  if (byName.length > 0) {
    return NextResponse.json({ type: 'name', products: byName });
  }

  // No match
  return NextResponse.json({ type: 'exact', products: [] });
}
