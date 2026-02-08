'use client';

import { useQuery } from '@tanstack/react-query';
import type { ScanResult } from '../types';

async function scanProduct(barcode: string): Promise<ScanResult> {
  const res = await fetch(`/api/inventory/scan?barcode=${encodeURIComponent(barcode)}`);
  if (!res.ok) throw new Error('Failed to scan');
  return res.json();
}

export function useScanProduct(barcode: string | null) {
  return useQuery({
    queryKey: ['scan', barcode],
    queryFn: () => scanProduct(barcode!),
    enabled: !!barcode && barcode.length > 0,
  });
}
