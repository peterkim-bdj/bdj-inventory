import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const groups = await prisma.productGroup.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      canonicalSku: true,
      canonicalBarcode: true,
      productType: true,
      vendor: { select: { id: true, name: true } },
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  return NextResponse.json({
    groups: groups.map((g) => ({
      ...g,
      productCount: g._count.products,
      _count: undefined,
    })),
  });
}
