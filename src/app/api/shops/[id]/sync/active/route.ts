import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const STALE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes (large stores can take 10+ min)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  // Find the most recent in-progress sync log
  const syncLog = await prisma.syncLog.findFirst({
    where: {
      shopifyStoreId: id,
      status: { in: ['FETCHING', 'APPLYING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, progress: true, createdAt: true },
  });

  if (!syncLog) {
    return NextResponse.json({ active: false });
  }

  // Check if sync is stale
  const ageMs = Date.now() - new Date(syncLog.createdAt).getTime();
  const isStale = ageMs > STALE_TIMEOUT_MS;

  if (isStale) {
    // Reset stale sync
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: 'FAILED', error: 'Sync timed out', completedAt: new Date() },
    });
    await prisma.shopifyStore.update({
      where: { id },
      data: { syncStatus: 'FAILED' },
    });
    return NextResponse.json({ active: false, reset: true });
  }

  return NextResponse.json({ active: true, syncLogId: syncLog.id });
}

// Reset stuck sync
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  // Find and fail any in-progress syncs
  const activeSyncs = await prisma.syncLog.findMany({
    where: {
      shopifyStoreId: id,
      status: { in: ['FETCHING', 'APPLYING'] },
    },
  });

  for (const sync of activeSyncs) {
    await prisma.syncLog.update({
      where: { id: sync.id },
      data: { status: 'FAILED', error: 'Manually cancelled', completedAt: new Date() },
    });
  }

  await prisma.shopifyStore.update({
    where: { id },
    data: { syncStatus: 'SYNCED' },
  });

  return NextResponse.json({ reset: true });
}
