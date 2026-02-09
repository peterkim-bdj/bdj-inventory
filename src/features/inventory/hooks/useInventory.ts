'use client';

import { useQuery } from '@tanstack/react-query';

interface UseInventoryParams {
  search?: string;
  status?: string;
  locationId?: string;
  productId?: string;
  shopifyStoreId?: string;
  vendorId?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

import type { InventoryItemDetail, InventoryFiltersMeta } from '../types';

interface InventoryResponse {
  items: InventoryItemDetail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    byStatus: Array<{ status: string; count: number }>;
    total: number;
  };
  filters: InventoryFiltersMeta;
}

async function fetchInventory(params: UseInventoryParams): Promise<InventoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.locationId) searchParams.set('locationId', params.locationId);
  if (params.productId) searchParams.set('productId', params.productId);
  if (params.shopifyStoreId) searchParams.set('shopifyStoreId', params.shopifyStoreId);
  if (params.vendorId) searchParams.set('vendorId', params.vendorId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`/api/inventory?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export function useInventory(params: UseInventoryParams = {}) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => fetchInventory(params),
  });
}
