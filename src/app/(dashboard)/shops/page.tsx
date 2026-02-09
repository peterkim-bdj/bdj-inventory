import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShopList } from '@/features/shops/components/ShopList';

export default function ShopsPage() {
  const t = useTranslations('shops');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Link
          href="/shops/new"
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {t('addShop')}
        </Link>
      </div>
      <ShopList />
    </div>
  );
}
