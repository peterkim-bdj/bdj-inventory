import { NextRequest, NextResponse } from 'next/server';
import { startSyncAsync, ShopNotFoundError, SyncInProgressError } from '@/features/shops/services/syncService';
import { ShopifyApiError } from '@/lib/shopify/client';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  try {
    const result = await startSyncAsync(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ShopifyApiError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof ShopNotFoundError) {
      return apiError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }
    if (error instanceof SyncInProgressError) {
      return apiError('SYNC_ALREADY_IN_PROGRESS', 'Sync already in progress', 409);
    }
    throw error;
  }
}
