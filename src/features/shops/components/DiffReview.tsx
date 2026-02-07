'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useDiff, useApplyDiff } from '../hooks/useDiffReview';
import { DiffSummary } from './DiffSummary';
import { DiffTabs } from './DiffTabs';

interface DiffReviewProps {
  shopId: string;
}

export function DiffReview({ shopId }: DiffReviewProps) {
  const t = useTranslations('sync');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { data, isLoading } = useDiff(shopId);
  const applyMutation = useApplyDiff();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selections from default actions when data loads
  const initSelections = useCallback(() => {
    if (!data) return;
    const defaults = new Set<string>();
    for (const item of data.items) {
      if (item.defaultAction !== 'keep') {
        defaults.add(item.id);
      }
    }
    setSelectedIds(defaults);
  }, [data]);

  // Call init once data is available
  if (data && selectedIds.size === 0 && data.items.some((i) => i.defaultAction !== 'keep')) {
    initSelections();
  }

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (type: 'NEW' | 'MODIFIED' | 'REMOVED') => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of data?.items ?? []) {
        if (item.type === type) next.add(item.id);
      }
      return next;
    });
  };

  const handleDeselectAll = (type: 'NEW' | 'MODIFIED' | 'REMOVED') => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of data?.items ?? []) {
        if (item.type === type) next.delete(item.id);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (!data) return;

    const actions = data.items.map((item) => ({
      diffId: item.id,
      action: selectedIds.has(item.id)
        ? item.type === 'REMOVED'
          ? ('deactivate' as const)
          : item.defaultAction === 'keep'
            ? ('keep' as const)
            : (item.defaultAction as 'add' | 'update')
        : ('keep' as const),
    }));

    applyMutation.mutate(
      { shopId, syncLogId: data.syncLogId, actions },
      {
        onSuccess: () => router.push('/shops'),
      },
    );
  };

  if (isLoading) {
    return <p className="text-zinc-500">{tCommon('status.loading')}</p>;
  }

  if (!data) {
    return <p className="text-zinc-500">{t('diff.noDiff')}</p>;
  }

  return (
    <div className="space-y-4">
      <DiffSummary summary={data.summary} />

      <div className="rounded-lg border bg-white dark:bg-zinc-900">
        <DiffTabs
          items={data.items}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => router.push('/shops')}
          className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {tCommon('button.cancel')}
        </button>
        <button
          onClick={handleApply}
          disabled={applyMutation.isPending || selectedIds.size === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {applyMutation.isPending
            ? t('diff.applying')
            : `${t('diff.applySelected')} (${selectedIds.size})`}
        </button>
      </div>
    </div>
  );
}
