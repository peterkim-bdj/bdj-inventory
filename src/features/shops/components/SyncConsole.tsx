'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { SyncProgressBar } from './SyncProgressBar';
import { SyncStepper } from './SyncStepper';
import type { SyncProgressState } from '../hooks/useSyncProgress';

interface SyncConsoleProps {
  progress: SyncProgressState;
  shopName: string;
  onClose: () => void;
}

export function SyncConsole({ progress, shopName, onClose }: SyncConsoleProps) {
  const t = useTranslations('sync.progress');
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress.logs.length]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const phaseLabel = progress.phase !== 'idle'
    ? t(`phase.${progress.phase}`)
    : '';

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('title')} — {shopName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Section */}
        <div className="px-5 py-4 space-y-3 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {phaseLabel}
            </span>
            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
              {progress.phase === 'fetching'
                ? `${progress.fetchedCount} products fetched`
                : progress.totalCount > 0
                  ? t('stats', { processed: progress.processedCount, total: progress.totalCount })
                  : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <SyncProgressBar
              percentage={progress.percentage}
              indeterminate={progress.phase === 'fetching'}
            />
            <span className="text-sm font-mono font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
              {progress.phase === 'fetching'
                ? ''
                : t('percentage', { value: progress.percentage })}
            </span>
          </div>

          <SyncStepper phase={progress.phase} />
        </div>

        {/* Console Log */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('console')}
            </span>
          </div>
          <div
            ref={containerRef}
            className="bg-gray-950 rounded-lg p-3 h-72 overflow-y-auto font-mono text-xs leading-relaxed"
          >
            {progress.logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500 shrink-0">
                  [{formatTime(log.timestamp)}]
                </span>
                <span
                  className={
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'success'
                        ? 'text-green-400'
                        : 'text-gray-300'
                  }
                >
                  {log.message}
                  {log.type === 'success' && ' \u2713'}
                  {log.type === 'error' && ' \u2717'}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Footer */}
        {(progress.phase === 'complete' || progress.phase === 'error') && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-zinc-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
