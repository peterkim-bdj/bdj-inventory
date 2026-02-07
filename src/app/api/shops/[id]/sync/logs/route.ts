import { NextRequest, NextResponse } from 'next/server';
import { getSyncLogs } from '@/features/shops/services/syncService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logs = await getSyncLogs(id);
  return NextResponse.json({ logs });
}
