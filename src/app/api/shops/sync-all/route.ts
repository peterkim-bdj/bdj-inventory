import { NextResponse } from 'next/server';
import { syncAllShops } from '@/features/shops/services/syncService';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const results = await syncAllShops();
  return NextResponse.json({ results });
}
