'use client';

import { useQuery } from '@tanstack/react-query';
import type { GroupedInventoryResponse } from '../types';

interface UseGroupedInventoryParams {
  search?: string;
  status?: string;
  locationId?: string;
  shopifyStoreId?: string;
  vendorId?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

async function fetchGroupedInventory(params: UseGroupedInventoryParams): Promise<GroupedInventoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.locationId) searchParams.set('locationId', params.locationId);
  if (params.shopifyStoreId) searchParams.set('shopifyStoreId', params.shopifyStoreId);
  if (params.vendorId) searchParams.set('vendorId', params.vendorId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`/api/inventory/grouped?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch grouped inventory');
  return res.json();
}

export function useGroupedInventory(params: UseGroupedInventoryParams = {}) {
  const { enabled = true, ...fetchParams } = params;
  return useQuery({
    queryKey: ['inventory-grouped', fetchParams],
    queryFn: () => fetchGroupedInventory(fetchParams),
    enabled,
    staleTime: 30_000,
  });
}
