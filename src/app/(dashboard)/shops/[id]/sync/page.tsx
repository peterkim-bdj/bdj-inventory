'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { DiffReview } from '@/features/shops/components/DiffReview';

export default function SyncDiffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('sync');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('diffReview.title')}</h1>
      <DiffReview shopId={id} />
    </div>
  );
}
