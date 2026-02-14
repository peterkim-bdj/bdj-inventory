'use client';

import { useTranslations } from 'next-intl';
import type { VendorListItem } from '../types';

interface VendorCardProps {
  vendor: VendorListItem;
  onClick?: () => void;
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const t = useTranslations('vendors');

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Header: name + status */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{vendor.name}</h3>
          {vendor.code && <p className="text-xs text-gray-400 mt-0.5">{vendor.code}</p>}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          vendor.isActive
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
        }`}>
          {vendor.isActive ? t('active') : t('inactive')}
        </span>
      </div>

      {/* Contact info */}
      <div className="mt-3 space-y-1.5">
        {vendor.contactName ? (
          <p className="text-sm text-gray-600 dark:text-zinc-400">{vendor.contactName}</p>
        ) : (
          <p className="text-sm text-orange-400 dark:text-orange-300">{t('missingContact')}</p>
        )}

        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400">
            {vendor.phone}
          </a>
        )}

        {vendor.email && (
          <a href={`mailto:${vendor.email}`} onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400">
            {vendor.email}
          </a>
        )}
      </div>

      {/* Footer: products + lead time */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>{t('productCount', { count: vendor._count.products })}</span>
        <span>{t('leadTimeDays', { days: vendor.minLeadDays })}</span>
      </div>
    </div>
  );
}
