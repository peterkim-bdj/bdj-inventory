'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

async function softDeleteItem(id: string) {
  const res = await fetch(`/api/inventory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'softDelete' }),
  });
  if (!res.ok) throw new Error('Failed to delete item');
  return res.json();
}

async function restoreItem(id: string) {
  const res = await fetch(`/api/inventory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'restore' }),
  });
  if (!res.ok) throw new Error('Failed to restore item');
  return res.json();
}

async function permanentDeleteItem(id: string) {
  const res = await fetch(`/api/inventory/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) throw new Error('Failed to permanently delete item');
  return res.json();
}

async function batchAction({ ids, action }: { ids: string[]; action: 'restore' | 'permanentDelete' }) {
  const res = await fetch('/api/inventory/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  });
  if (!res.ok) throw new Error(`Failed to batch ${action}`);
  return res.json();
}

export function useInventoryMutation() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-grouped'] });
  };

  const softDelete = useMutation({
    mutationFn: softDeleteItem,
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: restoreItem,
    onSuccess: invalidate,
  });

  const permanentDelete = useMutation({
    mutationFn: permanentDeleteItem,
    onSuccess: invalidate,
  });

  const batchRestore = useMutation({
    mutationFn: (ids: string[]) => batchAction({ ids, action: 'restore' }),
    onSuccess: invalidate,
  });

  const batchPermanentDelete = useMutation({
    mutationFn: (ids: string[]) => batchAction({ ids, action: 'permanentDelete' }),
    onSuccess: invalidate,
  });

  return { softDelete, restore, permanentDelete, batchRestore, batchPermanentDelete };
}
