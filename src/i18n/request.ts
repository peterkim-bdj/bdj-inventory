import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './config';

import enCommon from '@/messages/en/common.json';
import enShops from '@/messages/en/shops.json';
import enSync from '@/messages/en/sync.json';
import enProducts from '@/messages/en/products.json';
import enInventory from '@/messages/en/inventory.json';
import enAuth from '@/messages/en/auth.json';
import enAdmin from '@/messages/en/admin.json';
import enVendors from '@/messages/en/vendors.json';
import koCommon from '@/messages/ko/common.json';
import koShops from '@/messages/ko/shops.json';
import koSync from '@/messages/ko/sync.json';
import koProducts from '@/messages/ko/products.json';
import koInventory from '@/messages/ko/inventory.json';
import koAuth from '@/messages/ko/auth.json';
import koAdmin from '@/messages/ko/admin.json';
import koVendors from '@/messages/ko/vendors.json';

const allMessages: Record<string, Record<string, unknown>> = {
  en: { common: enCommon, shops: enShops, sync: enSync, products: enProducts, inventory: enInventory, auth: enAuth, admin: enAdmin, vendors: enVendors },
  ko: { common: koCommon, shops: koShops, sync: koSync, products: koProducts, inventory: koInventory, auth: koAuth, admin: koAdmin, vendors: koVendors },
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = defaultLocale;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  }

  return {
    locale,
    messages: allMessages[locale],
  };
});
