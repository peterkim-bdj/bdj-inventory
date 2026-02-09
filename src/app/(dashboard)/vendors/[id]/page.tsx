'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useVendor } from '@/features/vendors/hooks/useVendor';
import { VendorDetail } from '@/features/vendors/components/VendorDetail';

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const { data: vendor, isLoading } = useVendor(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg text-gray-400">{tCommon('status.loading')}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-gray-400">{tCommon('error.notFound')}</p>
        <Link href="/vendors" className="mt-4 text-sm text-blue-600 hover:underline">{t('backToList')}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/vendors" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        &larr; {t('backToList')}
      </Link>
      <VendorDetail vendor={vendor} />
    </div>
  );
}
