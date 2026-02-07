import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      shopifyStore: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
      productGroup: { select: { id: true, name: true } },
    },
  });

  if (!product) {
    return apiError('NOT_FOUND', 'Product not found', 404);
  }

  return NextResponse.json({ product });
}
