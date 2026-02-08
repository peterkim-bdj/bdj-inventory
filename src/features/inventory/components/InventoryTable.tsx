'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { InventoryItemDetail } from '../types';

interface InventoryTableProps {
  items: InventoryItemDetail[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const t = useTranslations('inventory');

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
      RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ''}`}>
        {t(`status.${status}`)}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.product')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.barcode')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.location')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.status')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.condition')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.receivedAt')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {item.product.imageUrl ? (
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
                  )}
                  <div>
                    <p className="font-medium truncate max-w-[200px]">{item.product.name}</p>
                    {item.product.sku && (
                      <p className="text-xs text-gray-400">{item.product.sku}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className="font-mono text-xs">{item.barcode}</span>
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {item.location ? `${item.location.name} (${item.location.code})` : '\u2014'}
              </td>
              <td className="px-5 py-4">
                {statusBadge(item.status)}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {t(`condition.${item.condition}`)}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {new Date(item.receivedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
