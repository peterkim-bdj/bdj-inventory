'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, localeNames, LOCALE_COOKIE, type Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function handleLocaleChange(newLocale: Locale) {
    // Set cookie
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    // Trigger server re-render to pick up new locale
    router.refresh();
  }

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
