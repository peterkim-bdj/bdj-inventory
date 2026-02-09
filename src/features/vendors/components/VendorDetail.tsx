'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDeleteVendor } from '../hooks/useVendorMutation';
import { VendorProductList } from './VendorProductList';
import type { VendorDetail as VendorDetailType } from '../types';

interface VendorDetailProps {
  vendor: VendorDetailType;
}

export function VendorDetail({ vendor }: VendorDetailProps) {
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const deleteMutation = useDeleteVendor();

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return;
    await deleteMutation.mutateAsync(vendor.id);
    router.push('/vendors');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              vendor.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
            }`}>
              {vendor.isActive ? t('active') : t('inactive')}
            </span>
          </div>
          {vendor.code && <p className="text-sm text-gray-400 mt-1">{vendor.code}</p>}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/vendors/${vendor.id}/edit`)}
              className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              {tCommon('button.edit')}
            </button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending}
              className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
              {tCommon('button.delete')}
            </button>
          </div>
        )}
      </div>

      {/* Contact Info Card */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-800">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">{t('detail.contactInfo')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label={t('form.contactName')} value={vendor.contactName} />
          <DetailRow label={t('form.phone')}>
            {vendor.phone ? (
              <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">{vendor.phone}</a>
            ) : <span className="text-gray-300">&mdash;</span>}
          </DetailRow>
          <DetailRow label={t('form.email')}>
            {vendor.email ? (
              <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline dark:text-blue-400">{vendor.email}</a>
            ) : <span className="text-gray-300">&mdash;</span>}
          </DetailRow>
          <DetailRow label={t('form.website')}>
            {vendor.website ? (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">{vendor.website}</a>
            ) : <span className="text-gray-300">&mdash;</span>}
          </DetailRow>
          <DetailRow label={t('form.address')} value={vendor.address} className="col-span-2" />
        </div>
      </div>

      {/* Settings Card */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-800">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">{t('detail.settings')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label={t('form.minLeadDays')} value={t('leadTimeDays', { days: vendor.minLeadDays })} />
          <DetailRow label={t('form.autoNotify')} value={vendor.autoNotify ? t('filter.notifyOn') : t('filter.notifyOff')} />
        </div>
        {vendor.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-sm text-gray-500 dark:text-zinc-400 whitespace-pre-wrap">{vendor.notes}</p>
          </div>
        )}
      </div>

      {/* Products */}
      <VendorProductList products={vendor.products} />
    </div>
  );
}

function DetailRow({
  label, value, children, className = '',
}: {
  label: string; value?: string | null; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {children ?? <p className="text-sm font-medium">{value || <span className="text-gray-300">&mdash;</span>}</p>}
    </div>
  );
}
