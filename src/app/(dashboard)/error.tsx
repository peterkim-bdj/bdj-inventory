'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md dark:bg-red-900/10 dark:border-red-800">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
          {t('status.error')}
        </h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">
          {t('error.generic')}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-full bg-red-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          {t('button.refresh')}
        </button>
      </div>
    </div>
  );
}
