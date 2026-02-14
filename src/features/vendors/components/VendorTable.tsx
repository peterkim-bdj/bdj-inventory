'use client';

import { useTranslations } from 'next-intl';
import type { VendorListItem } from '../types';

interface VendorTableProps {
  vendors: VendorListItem[];
  onVendorClick?: (id: string) => void;
}

export function VendorTable({ vendors, onVendorClick }: VendorTableProps) {
  const t = useTranslations('vendors');

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.name')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.contact')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.phone')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.email')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.products')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.leadTime')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.status')}</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr
              key={vendor.id}
              onClick={() => onVendorClick?.(vendor.id)}
              className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 ${onVendorClick ? 'cursor-pointer' : ''}`}
            >
              <td className="px-5 py-4">
                <div>
                  <p className="font-medium">{vendor.name}</p>
                  {vendor.code && <p className="text-xs text-gray-400">{vendor.code}</p>}
                </div>
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {vendor.contactName || (
                  <span className="text-orange-400 dark:text-orange-300 text-xs">{t('missingContact')}</span>
                )}
              </td>
              <td className="px-5 py-4">
                {vendor.phone ? (
                  <a
                    href={`tel:${vendor.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {vendor.phone}
                  </a>
                ) : (
                  <span className="text-gray-300 dark:text-zinc-600">&mdash;</span>
                )}
              </td>
              <td className="px-5 py-4">
                {vendor.email ? (
                  <a
                    href={`mailto:${vendor.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {vendor.email}
                  </a>
                ) : (
                  <span className="text-gray-300 dark:text-zinc-600">&mdash;</span>
                )}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {vendor._count.products}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {t('leadTimeDays', { days: vendor.minLeadDays })}
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  vendor.isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
                }`}>
                  {vendor.isActive ? t('active') : t('inactive')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
