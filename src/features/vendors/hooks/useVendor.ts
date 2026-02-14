'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchVendor(id: string) {
  const res = await fetch(`/api/vendors/${id}`);
  if (!res.ok) throw new Error('Failed to fetch vendor');
  return res.json();
}

export function useVendor(id: string | null) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: () => fetchVendor(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
