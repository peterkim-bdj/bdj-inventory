import { NextRequest, NextResponse } from 'next/server';
import { getSyncLogs } from '@/features/shops/services/syncService';
import { requireAuth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;
  const logs = await getSyncLogs(id);
  return NextResponse.json({ logs });
}
