import { NextRequest, NextResponse } from 'next/server';
import { createShopSchema } from '@/features/shops/types';
import { getShops, createShop } from '@/features/shops/services/shopService';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@/generated/prisma/client';
const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;

export async function GET() {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const shops = await getShops();
  return NextResponse.json({ shops });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const body = await request.json();
  const parsed = createShopSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const shop = await createShop(parsed.data);
    return NextResponse.json(shop, { status: 201 });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return apiError('SHOP_DOMAIN_EXISTS', 'A shop with this domain already exists', 409);
    }
    throw error;
  }
}
