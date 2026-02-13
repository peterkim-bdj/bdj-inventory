'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import type { InventoryItemDetail } from '../types';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface InventoryTableProps {
  items: InventoryItemDetail[];
  onItemClick?: (id: string) => void;
  onProductClick?: (productId: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
}

export function InventoryTable({ items, onItemClick, onProductClick, onPrint }: InventoryTableProps) {
  const t = useTranslations('inventory');

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.product')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.barcode')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.location')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.status')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.condition')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.receivedAt')}</th>
            <th className="px-5 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 ${onItemClick ? 'cursor-pointer' : ''}`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {item.product.imageUrl ? (
                    <Image src={item.product.imageUrl} alt={item.product.name} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
                  )}
                  <div>
                    <p
                      className={`font-medium truncate max-w-[200px] ${onProductClick ? 'hover:underline cursor-pointer' : ''}`}
                      onClick={(e) => { if (onProductClick) { e.stopPropagation(); onProductClick(item.product.id); } }}
                    >
                      {item.product.name}
                      {item.product.variantTitle && (
                        <span className="ml-1 font-normal text-gray-400">— {item.product.variantTitle}</span>
                      )}
                    </p>
                    {item.product.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <Barcode value={item.barcode} height={24} width={1} fontSize={9} />
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {item.location ? `${item.location.name} (${item.location.code})` : '\u2014'}
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] ?? ''}`}>
                  {t(`status.${item.status}`)}
                </span>
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">{t(`condition.${item.condition}`)}</td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">{new Date(item.receivedAt).toLocaleDateString()}</td>
              <td className="px-5 py-4">
                {onPrint && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPrint(item); }}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800"
                    aria-label={t('detail.print')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
