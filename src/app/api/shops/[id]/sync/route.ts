import { NextRequest, NextResponse } from 'next/server';
import { startSync } from '@/features/shops/services/syncService';
import { ShopifyApiError } from '@/lib/shopify/client';
import { apiError } from '@/lib/api/error';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await startSync(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ShopifyApiError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error && error.message === 'Shop not found') {
      return apiError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }
    if (error instanceof Error && error.message === 'Sync already in progress') {
      return apiError('SYNC_ALREADY_IN_PROGRESS', 'Sync already in progress', 409);
    }
    throw error;
  }
}
