export const locales = ['en', 'ko'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
};

// Cookie name for locale persistence
export const LOCALE_COOKIE = 'NEXT_LOCALE';
