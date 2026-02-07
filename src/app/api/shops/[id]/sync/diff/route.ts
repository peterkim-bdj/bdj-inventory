import { NextRequest, NextResponse } from 'next/server';
import { getDiff } from '@/features/shops/services/syncService';
import { apiError } from '@/lib/api/error';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const diff = await getDiff(id);

  if (!diff) {
    return apiError('SYNC_NOT_IN_DIFF_REVIEW', 'No diff review in progress', 404);
  }

  return NextResponse.json(diff);
}
