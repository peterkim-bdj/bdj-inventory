'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProductsResponse } from '../types';

interface UseProductsParams {
  search?: string;
  storeIds?: string[];
  vendorIds?: string[];
  productTypes?: string[];
  missingSku?: string;
  missingBarcode?: string;
  missingPrice?: string;
  missingImage?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

async function fetchProducts(params: UseProductsParams): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set('search', params.search);
  if (params.storeIds?.length) searchParams.set('storeIds', params.storeIds.join(','));
  if (params.vendorIds?.length) searchParams.set('vendorIds', params.vendorIds.join(','));
  if (params.productTypes?.length) searchParams.set('productTypes', params.productTypes.join(','));
  if (params.missingSku) searchParams.set('missingSku', params.missingSku);
  if (params.missingBarcode) searchParams.set('missingBarcode', params.missingBarcode);
  if (params.missingPrice) searchParams.set('missingPrice', params.missingPrice);
  if (params.missingImage) searchParams.set('missingImage', params.missingImage);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`/api/products?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export function useProducts(params: UseProductsParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
  });
}
