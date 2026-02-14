'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="w-full max-w-sm space-y-4 text-center">
      <h2 className="text-lg font-semibold text-red-600">{t('status.error')}</h2>
      <p className="text-sm text-gray-500">{t('error.generic')}</p>
      <button
        onClick={reset}
        className="rounded-full bg-black px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {t('button.refresh')}
      </button>
    </div>
  );
}
