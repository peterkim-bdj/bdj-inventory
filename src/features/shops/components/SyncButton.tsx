'use client';

import { useTranslations } from 'next-intl';
import { useStartSync } from '../hooks/useSync';
import { useRouter } from 'next/navigation';

interface SyncButtonProps {
  shopId: string;
  syncStatus: string;
}

export function SyncButton({ shopId, syncStatus }: SyncButtonProps) {
  const t = useTranslations('sync');
  const router = useRouter();
  const syncMutation = useStartSync();

  if (syncStatus === 'DIFF_REVIEW') {
    return (
      <button
        onClick={() => router.push(`/shops/${shopId}/sync`)}
        className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:border-yellow-800 dark:hover:bg-yellow-950/50"
      >
        {t('button.reviewDiff')}
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        syncMutation.mutate(shopId, {
          onSuccess: (data) => {
            if (data.status === 'DIFF_REVIEW') {
              router.push(`/shops/${shopId}/sync`);
            }
          },
        });
      }}
      disabled={syncMutation.isPending || syncStatus === 'IN_PROGRESS'}
      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {syncMutation.isPending || syncStatus === 'IN_PROGRESS'
        ? t('button.syncing')
        : t('button.sync')}
    </button>
  );
}
