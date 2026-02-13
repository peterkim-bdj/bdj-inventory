'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useStartSync } from '../hooks/useSync';
import { useSyncProgress } from '../hooks/useSyncProgress';
import { SyncProgressBar } from './SyncProgressBar';
import { SyncConsole } from './SyncConsole';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface SyncButtonProps {
  shopId: string;
  shopName: string;
  syncStatus: string;
}

export function SyncButton({ shopId, shopName, syncStatus }: SyncButtonProps) {
  const t = useTranslations('sync');
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncMutation = useStartSync();
  const [syncLogId, setSyncLogId] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [resetting, setResetting] = useState(false);
  const progress = useSyncProgress(syncLogId);

  // Auto-detect active sync on mount or when status is IN_PROGRESS
  useEffect(() => {
    if (syncStatus === 'IN_PROGRESS' && !syncLogId) {
      fetch(`/api/shops/${shopId}/sync/active`)
        .then((res) => res.json())
        .then((data) => {
          if (data.active && data.syncLogId) {
            setSyncLogId(data.syncLogId);
          } else if (data.reset) {
            // Stale sync was auto-reset
            queryClient.invalidateQueries({ queryKey: ['shops'] });
          }
        })
        .catch(() => {});
    }
  }, [syncStatus, shopId, syncLogId, queryClient]);

  const handleCloseConsole = useCallback(() => {
    setShowConsole(false);
  }, []);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await fetch(`/api/shops/${shopId}/sync/active`, { method: 'DELETE' });
      setSyncLogId(null);
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    } finally {
      setResetting(false);
    }
  }, [shopId, queryClient]);

  // When sync completes, invalidate queries
  useEffect(() => {
    if (progress.phase === 'complete' && syncLogId) {
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['shops'] });
        setSyncLogId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [progress.phase, syncLogId, queryClient]);

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

  // Show progress when syncing
  const isActive = syncLogId && progress.phase !== 'idle' && progress.phase !== 'complete' && progress.phase !== 'error';
  const isInProgress = isActive || syncMutation.isPending || syncStatus === 'IN_PROGRESS';

  if (isInProgress) {
    return (
      <>
        <div className="flex items-center gap-2 min-w-[180px]">
          <div className="flex-1 min-w-[80px]">
            <SyncProgressBar
              percentage={progress.percentage}
              indeterminate={progress.phase === 'fetching'}
              size="sm"
            />
          </div>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 min-w-[2.5rem] text-right">
            {progress.phase === 'fetching'
              ? `${progress.fetchedCount}`
              : `${progress.percentage}%`}
          </span>
          <button
            onClick={() => setShowConsole(true)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={t('progress.openConsole')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {/* Reset button for stuck syncs */}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Cancel sync"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showConsole && (
          <SyncConsole
            progress={progress}
            shopName={shopName}
            onClose={handleCloseConsole}
          />
        )}
      </>
    );
  }

  return (
    <button
      onClick={() => {
        syncMutation.mutate(shopId, {
          onSuccess: (data) => {
            if (data.status === 'DIFF_REVIEW') {
              router.push(`/shops/${shopId}/sync`);
            } else if (data.syncLogId) {
              setSyncLogId(data.syncLogId);
            }
          },
        });
      }}
      disabled={syncMutation.isPending}
      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {t('button.sync')}
    </button>
  );
}
