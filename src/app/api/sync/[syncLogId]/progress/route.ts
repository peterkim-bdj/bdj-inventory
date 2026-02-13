import { NextRequest, NextResponse } from 'next/server';
import { getSyncProgress } from '@/features/shops/services/syncService';
import { requireAuth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ syncLogId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { syncLogId } = await params;
  const progress = await getSyncProgress(syncLogId);

  if (!progress) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(progress);
}
