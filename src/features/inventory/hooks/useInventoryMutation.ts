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

  return { softDelete, restore, permanentDelete };
}
