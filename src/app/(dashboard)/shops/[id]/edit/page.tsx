'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShopForm } from '@/features/shops/components/ShopForm';
import { useUpdateShop } from '@/features/shops/hooks/useShops';

export default function EditShopPage() {
  const t = useTranslations('shops');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const updateMutation = useUpdateShop();

  const { data: shop, isLoading } = useQuery({
    queryKey: ['shop', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/shops/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch shop');
      return res.json();
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">{tCommon('status.loading')}</p>;
  }

  if (!shop) {
    return <p className="text-muted-foreground">{tCommon('error.notFound')}</p>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">{t('editShop')}</h1>
      <div className="rounded-lg border bg-white p-6 dark:bg-zinc-900">
        <ShopForm
          defaultValues={{
            name: shop.name,
            domain: shop.domain,
            accessToken: shop.accessToken,
            apiVersion: shop.apiVersion,
          }}
          onSubmit={(data) => {
            updateMutation.mutate(
              { id: params.id, data },
              { onSuccess: () => router.push('/shops') }
            );
          }}
          isLoading={updateMutation.isPending}
        />
        {updateMutation.error && (
          <p className="mt-3 text-sm text-red-600">{updateMutation.error.message}</p>
        )}
      </div>
    </div>
  );
}
