import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './config';

export default getRequestConfig(async () => {
  // 1. Read locale from cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  // 2. Validate and resolve locale
  let locale: Locale = defaultLocale;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  }

  // 3. Load all message files for the locale
  const namespaces = ['common'];

  // Feature-specific namespaces (added as features are built)
  const optionalNamespaces = [
    'shops', 'sync', 'products', 'vendors',
    'inventory', 'webhooks', 'workflows',
  ];

  const messages: Record<string, Record<string, unknown>> = {};

  // Load required namespaces
  for (const ns of namespaces) {
    messages[ns] = (await import(`@/messages/${locale}/${ns}.json`)).default;
  }

  // Load optional namespaces (skip if file doesn't exist)
  for (const ns of optionalNamespaces) {
    try {
      messages[ns] = (await import(`@/messages/${locale}/${ns}.json`)).default;
    } catch {
      // Namespace not yet created — skip silently
    }
  }

  return {
    locale,
    messages,
  };
});
