'use client';

import { useQuery } from '@tanstack/react-query';
import type { ScanResult } from '../types';

interface ScanParams {
  barcode?: string | null;
  candidates?: string[] | null;
}

async function scanProduct(query: string): Promise<ScanResult> {
  const res = await fetch(`/api/inventory/scan?${query}`);
  if (!res.ok) throw new Error('Failed to scan');
  return res.json();
}

export function useScanProduct(params: ScanParams) {
  const { barcode, candidates } = params;
  const queryParams = new URLSearchParams();
  if (barcode) queryParams.set('barcode', barcode);
  if (candidates?.length) queryParams.set('candidates', candidates.join(','));

  const hasQuery = !!(barcode || candidates?.length);

  return useQuery({
    queryKey: ['scan', barcode, candidates],
    queryFn: () => scanProduct(queryParams.toString()),
    enabled: hasQuery,
    staleTime: 30_000,
  });
}
