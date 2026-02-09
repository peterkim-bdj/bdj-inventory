import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { createProductSchema } from '@/features/inventory/types';
import { generateUniqueBarcodePrefix } from '@/lib/barcode';

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const { name, sku, shopifyBarcode, productType, price, vendorName } = parsed.data;

  let barcodePrefix: string;
  try {
    barcodePrefix = await generateUniqueBarcodePrefix();
  } catch {
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
