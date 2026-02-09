'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useVendor } from '@/features/vendors/hooks/useVendor';
import { VendorForm } from '@/features/vendors/components/VendorForm';

export default function VendorEditPage({ params }: { params: Promise<{ id: string }> }) {
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/vendors/${id}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          &larr;
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t('editTitle')}</h1>
      </div>
      <VendorForm vendor={vendor} />
    </div>
  );
}
