import { NextRequest, NextResponse } from 'next/server';
import { updateShopSchema } from '@/features/shops/types';
import { getShopById, updateShop, deleteShop } from '@/features/shops/services/shopService';
import { apiError } from '@/lib/api/error';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shop = await getShopById(id);

  if (!shop) {
    return apiError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }

  return NextResponse.json(shop);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateShopSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const existing = await getShopById(id);
  if (!existing) {
    return apiError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }

  const shop = await updateShop(id, parsed.data);
  return NextResponse.json(shop);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await getShopById(id);
  if (!existing) {
    return apiError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }

  const result = await deleteShop(id);
  return NextResponse.json(result);
}
