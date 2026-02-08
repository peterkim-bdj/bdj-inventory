import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { registerSchema } from '@/features/inventory/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const { productId, locationId, quantity, condition, notes } = parsed.data;

  // Verify product exists
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, name: true, barcodePrefix: true },
  });

  if (!product) {
    return apiError('NOT_FOUND', 'Product not found', 404);
  }

  // Verify location if provided
  if (locationId) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, isActive: true },
    });
    if (!location) {
      return apiError('NOT_FOUND', 'Location not found', 404);
    }
  }

  // Get current max sequence for this product's barcode prefix
  const existingCount = await prisma.inventoryItem.count({
    where: { barcode: { startsWith: product.barcodePrefix + '-' } },
  });

  // Create items with sequential barcodes
  const items: Array<{ id: string; barcode: string }> = [];

  for (let i = 0; i < quantity; i++) {
    const seq = existingCount + i + 1;
    const barcode = `${product.barcodePrefix}-${String(seq).padStart(3, '0')}`;

    const item = await prisma.inventoryItem.create({
      data: {
        barcode,
        productId,
        locationId: locationId ?? null,
        condition,
        notes,
        status: 'AVAILABLE',
      },
      select: { id: true, barcode: true },
    });

    items.push(item);
  }

  return NextResponse.json({
    items,
    product: {
      id: product.id,
      name: product.name,
      barcodePrefix: product.barcodePrefix,
    },
  }, { status: 201 });
}
