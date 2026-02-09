'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateShopInput, UpdateShopInput, Shop } from '../types';

async function fetchShops(): Promise<{ shops: Shop[] }> {
  const res = await fetch('/api/shops');
  if (!res.ok) throw new Error('Failed to fetch shops');
  return res.json();
}

async function createShop(data: CreateShopInput): Promise<Shop> {
  const res = await fetch('/api/shops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Failed to create shop');
  }
  return res.json();
}

async function updateShop({ id, data }: { id: string; data: UpdateShopInput }): Promise<Shop> {
  const res = await fetch(`/api/shops/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Failed to update shop');
  }
  return res.json();
}

async function deleteShop(id: string): Promise<{ id: string; deactivatedProducts: number }> {
  const res = await fetch(`/api/shops/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Failed to delete shop');
  }
  return res.json();
}

export function useShops() {
  return useQuery({
    queryKey: ['shops'],
    queryFn: fetchShops,
    select: (data) => data.shops,
  });
}

export function useCreateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops'] }),
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateShop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops'] }),
  });
}

export function useDeleteShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops'] }),
  });
}
