'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { VendorForm } from '@/features/vendors/components/VendorForm';

export default function VendorCreatePage() {
  const t = useTranslations('vendors');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendors" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          &larr;
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t('createTitle')}</h1>
      </div>
      <VendorForm />
    </div>
  );
}
