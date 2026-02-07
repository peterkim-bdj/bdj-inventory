'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, localeNames, LOCALE_COOKIE, type Locale } from '@/i18n/config';

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
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => handleLocaleChange(l)}
          className={`px-2 py-1 text-sm rounded ${
            locale === l
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          disabled={locale === l}
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}
