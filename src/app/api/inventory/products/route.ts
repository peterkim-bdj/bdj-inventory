import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { createProductSchema } from '@/features/inventory/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const { name, sku, shopifyBarcode, productType, price, vendorName } = parsed.data;

  // Generate barcodePrefix: BDJ-{random 6 chars}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let barcodePrefix = '';
  let attempts = 0;

  do {
    const random = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    barcodePrefix = `BDJ-${random}`;
    const existing = await prisma.product.findUnique({
      where: { barcodePrefix },
      select: { id: true },
    });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return apiError('CONFLICT', 'Could not generate unique barcode prefix', 500);
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku,
      shopifyBarcode,
      productType,
      price: price ?? null,
      vendorName,
      barcodePrefix,
      shopifySynced: false,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcodePrefix: true,
      shopifySynced: true,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
