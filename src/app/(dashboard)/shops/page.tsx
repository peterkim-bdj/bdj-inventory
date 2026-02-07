import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShopList } from '@/features/shops/components/ShopList';

export default function ShopsPage() {
  const t = useTranslations('shops');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Link
          href="/shops/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {t('addShop')}
        </Link>
      </div>
      <ShopList />
    </div>
  );
}
