'use client';

import { useQuery } from '@tanstack/react-query';

interface UseVendorsParams {
  search?: string;
  hasContact?: string;
  isActive?: string;
  autoNotify?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

async function fetchVendors(params: UseVendorsParams) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  const res = await fetch(`/api/vendors?${sp}`);
  if (!res.ok) throw new Error('Failed to fetch vendors');
  return res.json();
}

export function useVendors(params: UseVendorsParams = {}) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: () => fetchVendors(params),
    staleTime: 30_000,
  });
}
