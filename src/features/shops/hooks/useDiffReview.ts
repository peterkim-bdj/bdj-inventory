'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface DiffItem {
  id: string;
  type: 'NEW' | 'MODIFIED' | 'REMOVED';
  shopifyProductId?: string;
  shopifyVariantId?: string;
  productId?: string;
  data?: Record<string, unknown>;
  changes?: Array<{ field: string; old: string | number | null; new: string | number | null }>;
  defaultAction: 'add' | 'update' | 'keep';
}

interface DiffResponse {
  syncLogId: string;
  shopName: string;
  summary: {
    new: number;
    modified: number;
    removed: number;
    unchanged: number;
  };
  items: DiffItem[];
}

interface ApplyAction {
  diffId: string;
  action: 'add' | 'update' | 'keep' | 'deactivate';
}

async function fetchDiff(shopId: string): Promise<DiffResponse> {
  const res = await fetch(`/api/shops/${shopId}/sync/diff`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Failed to fetch diff');
  }
  return res.json();
}

async function applyDiff({
  shopId,
  syncLogId,
  actions,
}: {
  shopId: string;
  syncLogId: string;
  actions: ApplyAction[];
}) {
  const res = await fetch(`/api/shops/${shopId}/sync/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ syncLogId, actions }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Failed to apply diff');
  }
  return res.json();
}

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  totalFetched: number;
  newCount: number;
  modifiedCount: number;
  removedCount: number;
  unchangedCount: number;
  appliedCount: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

async function fetchSyncLogs(shopId: string): Promise<{ logs: SyncLog[] }> {
  const res = await fetch(`/api/shops/${shopId}/sync/logs`);
  if (!res.ok) throw new Error('Failed to fetch sync logs');
  return res.json();
}

export function useDiff(shopId: string) {
  return useQuery({
    queryKey: ['diff', shopId],
    queryFn: () => fetchDiff(shopId),
  });
}

export function useApplyDiff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyDiff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['diff'] });
      queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
    },
  });
}

export function useSyncLogs(shopId: string) {
  return useQuery({
    queryKey: ['syncLogs', shopId],
    queryFn: () => fetchSyncLogs(shopId),
    select: (data) => data.logs,
  });
}
