'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ShopForm } from '@/features/shops/components/ShopForm';
import { useCreateShop } from '@/features/shops/hooks/useShops';

export default function NewShopPage() {
  const t = useTranslations('shops');
  const router = useRouter();
  const createMutation = useCreateShop();

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-bold tracking-tight mb-6">{t('addShop')}</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800">
        <ShopForm
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => router.push('/shops'),
            });
          }}
          isLoading={createMutation.isPending}
          submitLabel={t('addShop')}
        />
        {createMutation.error && (
          <p className="mt-3 text-sm text-red-600">{createMutation.error.message}</p>
        )}
      </div>
    </div>
  );
}
