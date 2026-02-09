'use client';

import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';

export default function PendingPage() {
  const t = useTranslations('auth');

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      {/* Clock icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-amber-500">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pending.title')}</h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{t('pending.message')}</p>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="rounded-full border border-gray-200 px-6 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {t('pending.logout')}
      </button>
    </div>
  );
}
