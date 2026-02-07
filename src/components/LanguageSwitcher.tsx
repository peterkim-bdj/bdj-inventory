'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, LOCALE_COOKIE, type Locale } from '@/i18n/config';

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    setCookie(LOCALE_COOKIE, newLocale);
    router.refresh();
  }, [router]);

  return (
    <div className="flex items-center rounded-full border border-gray-200 p-0.5 dark:border-zinc-700">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => handleLocaleChange(l)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            locale === l
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
