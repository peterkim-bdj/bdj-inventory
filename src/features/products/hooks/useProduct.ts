'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProductDetail } from '../types';

async function fetchProduct(id: string): Promise<{ product: ProductDetail }> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });
}
