'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

async function startSync(shopId: string) {
  const res = await fetch(`/api/shops/${shopId}/sync`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Failed to start sync');
  }
  return res.json();
}

async function syncAll() {
  const res = await fetch('/api/shops/sync-all', { method: 'POST' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Failed to sync all shops');
  }
  return res.json();
}

export function useStartSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}

export function useSyncAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}
