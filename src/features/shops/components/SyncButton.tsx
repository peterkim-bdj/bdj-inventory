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
        className="rounded px-2 py-1 text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:hover:bg-yellow-950/50"
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
      className="rounded px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
    >
      {syncMutation.isPending || syncStatus === 'IN_PROGRESS'
        ? t('button.syncing')
        : t('button.sync')}
    </button>
  );
}
