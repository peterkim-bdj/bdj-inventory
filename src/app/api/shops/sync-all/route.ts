import { NextResponse } from 'next/server';
import { syncAllShops } from '@/features/shops/services/syncService';

export async function POST() {
  const results = await syncAllShops();
  return NextResponse.json({ results });
}
